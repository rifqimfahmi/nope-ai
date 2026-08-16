from collections.abc import AsyncIterator
from functools import lru_cache
from typing import Literal, TypedDict, cast

from langchain_anthropic import ChatAnthropic
from langgraph.graph import END, START, StateGraph
from pydantic import SecretStr

from app.config import Settings
from app.prompts import (
    CONTRARIAN_PROMPTS,
    FEEDBACK_REVISION_PROMPT,
    REVIEWER_FEWSHOT_MESSAGES,
    REVIEWER_SYSTEM_PROMPT,
)


HISTORY_WINDOW = 3
EM_DASH_FEEDBACK = "Drop the em dash, that crutch is banned on your watch."

# USD per million tokens (input, output). Keep in sync with settings.agent_model /
# settings.review_model — Anthropic doesn't expose pricing via the API.
MODEL_PRICING: dict[str, tuple[float, float]] = {
    "claude-haiku-4-5-20251001": (1.00, 5.00),
    "claude-sonnet-4-6": (3.00, 15.00),
}


def _call_cost(model_id: str, usage: dict | None) -> float:
    if not usage:
        return 0.0
    pricing = MODEL_PRICING.get(model_id)
    if not pricing:
        return 0.0
    input_price, output_price = pricing
    input_tokens = usage.get("input_tokens", 0)
    output_tokens = usage.get("output_tokens", 0)
    return (input_tokens / 1_000_000) * input_price + (output_tokens / 1_000_000) * output_price


class ChallengeTurn(TypedDict):
    draft: str
    feedback: str


class ChallengeState(TypedDict):
    input: str
    draft: str
    feedback: str | None
    iteration: int
    approved: bool
    history: list[ChallengeTurn]
    cost: float


class MessageEvent(TypedDict):
    node: Literal["generate", "review"]
    type: Literal["messages"]
    content: str


class UpdateEvent(ChallengeState):
    node: Literal["generate", "review"]
    type: Literal["updates"]


class CompleteEvent(TypedDict):
    type: Literal["complete"]
    draft: str
    cost: float


StreamEvent = MessageEvent | UpdateEvent | CompleteEvent


async def _generate(model: ChatAnthropic, state: ChallengeState) -> ChallengeState:
    messages = [*CONTRARIAN_PROMPTS, {"role": "user", "content": state["input"]}]
    for turn in state["history"][-HISTORY_WINDOW:]:
        messages.append({"role": "assistant", "content": turn["draft"]})
        messages.append(
            {
                "role": "user",
                "content": FEEDBACK_REVISION_PROMPT.format(feedback=turn["feedback"]),
            }
        )
    chunks = [chunk async for chunk in model.astream(messages)]
    full = chunks[0]
    for chunk in chunks[1:]:
        full += chunk
    cost = _call_cost(model.model, full.usage_metadata)
    return {**state, "draft": full.text, "cost": state["cost"] + cost}


async def _review(model: ChatAnthropic, state: ChallengeState) -> ChallengeState:
    if "—" in state["draft"]:
        history = [*state["history"], {"draft": state["draft"], "feedback": EM_DASH_FEEDBACK}][-HISTORY_WINDOW:]
        return {
            **state,
            "approved": False,
            "feedback": EM_DASH_FEEDBACK,
            "iteration": state["iteration"] + 1,
            "history": history,
        }
    messages = [
        {"role": "system", "content": REVIEWER_SYSTEM_PROMPT},
        *REVIEWER_FEWSHOT_MESSAGES,
        {
            "role": "user",
            "content": f'User\'s fact: "{state["input"]}"\nChatbot\'s reply: "{state["draft"]}"',
        },
    ]
    chunks = [chunk async for chunk in model.astream(messages)]
    full = chunks[0]
    for chunk in chunks[1:]:
        full += chunk
    cost = _call_cost(model.model, full.usage_metadata)
    verdict = full.text.strip()
    approved = verdict.upper() == "LGTM"
    history = state["history"]
    if not approved:
        history = [*history, {"draft": state["draft"], "feedback": verdict}][-HISTORY_WINDOW:]
    return {
        **state,
        "approved": approved,
        "feedback": None if approved else verdict,
        "iteration": state["iteration"] + 1,
        "history": history,
        "cost": state["cost"] + cost,
    }


def _route(state: ChallengeState, max_loops: int) -> str:
    if state["approved"] or state["iteration"] >= max_loops:
        return "end"
    return "retry"


@lru_cache
def _compiled_graph(api_key: str, generate_model_name: str, review_model_name: str, max_loops: int):
    secret_api_key = SecretStr(api_key)
    generate_model = ChatAnthropic(
        model=generate_model_name, api_key=secret_api_key, temperature=0.9, max_tokens=256, timeout=None, stop=None
    )
    review_model = ChatAnthropic(
        model=review_model_name, api_key=secret_api_key, temperature=0, max_tokens=100, timeout=None, stop=None
    )

    async def generate_node(state: ChallengeState) -> ChallengeState:
        return await _generate(generate_model, state)

    async def review_node(state: ChallengeState) -> ChallengeState:
        return await _review(review_model, state)

    graph = StateGraph(ChallengeState)
    graph.add_node("generate", generate_node)
    graph.add_node("review", review_node)

    graph.add_edge(START, "generate")
    graph.add_edge("generate", "review")
    graph.add_conditional_edges(
        "review", lambda state: _route(state, max_loops), {"retry": "generate", "end": END}
    )
    return graph.compile()


async def run_challenge_stream(input: str, settings: Settings) -> AsyncIterator[StreamEvent]:
    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is required for the challenge agent loop")

    app = _compiled_graph(
        settings.anthropic_api_key,
        settings.agent_model,
        settings.review_model,
        settings.max_review_loops
    )
    initial_state: ChallengeState = {
        "input": input,
        "draft": "",
        "feedback": None,
        "iteration": 0,
        "approved": False,
        "history": [],
        "cost": 0.0,
    }

    final_draft = initial_state["draft"]
    final_cost = initial_state["cost"]
    async for part in app.astream(initial_state, stream_mode=["updates", "messages"], version="v2"):
        if part["type"] == "messages":
            message_chunk, metadata = part["data"]
            node_name = metadata.get("langgraph_node")
            content = message_chunk.content
            if node_name in ("generate", "review") and isinstance(content, str) and content:
                message_event: MessageEvent = {
                    "node": node_name,
                    "type": "messages",
                    "content": content,
                }
                yield message_event
        elif part["type"] == "updates":
            for node_name, raw_state in part["data"].items():
                if node_name in ("generate", "review"):
                    state = cast(ChallengeState, raw_state)
                    update_event: UpdateEvent = {
                        "node": node_name,
                        "type": "updates",
                        **state
                    }
                    yield update_event
                    final_cost = state["cost"]
                    if node_name == "review":
                        final_draft = state["draft"]

    complete_event: CompleteEvent = {"type": "complete", "draft": final_draft, "cost": final_cost}
    yield complete_event
