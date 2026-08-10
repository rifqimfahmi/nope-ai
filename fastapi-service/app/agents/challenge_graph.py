from collections.abc import AsyncIterator
from functools import lru_cache
from typing import Literal, TypedDict, cast

from langchain_anthropic import ChatAnthropic
from langgraph.graph import END, START, StateGraph
from pydantic import SecretStr

from app.config import Settings
from app.prompts import CONTRARIAN_PROMPTS

REVIEWER_SYSTEM_PROMPT = (
    "You review a 'Playful Contrarian' chatbot's reply to a user's fact. The reply must: "
    "(1) cheerfully disagree with the fact, (2) give a simple, common-sense, everyday reason "
    "with no jargon, (3) be a single punchy sentence, (4) never agree with the user - the "
    "reply's substantive stance must be the OPPOSITE of the user's claim, not just phrased "
    "with contrarian-sounding words like 'Actually' or 'I disagree'. For comparison facts "
    "('A is better than B'), reject any reply that ends up siding with A even if it criticizes "
    "B along the way; the reply must argue for B. "
    "If the reply satisfies all four rules, respond with exactly: LGTM "
    "Otherwise respond with one short sentence describing what to fix, and nothing else."
)


HISTORY_WINDOW = 3


class ChallengeTurn(TypedDict):
    draft: str
    feedback: str


class ChallengeState(TypedDict):
    fact: str
    draft: str
    feedback: str | None
    iteration: int
    approved: bool
    history: list[ChallengeTurn]


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


StreamEvent = MessageEvent | UpdateEvent | CompleteEvent


async def _generate(model: ChatAnthropic, state: ChallengeState) -> ChallengeState:
    messages = [*CONTRARIAN_PROMPTS, {"role": "user", "content": state["fact"]}]
    for turn in state["history"][-HISTORY_WINDOW:]:
        messages.append({"role": "assistant", "content": turn["draft"]})
        messages.append(
            {
                "role": "user",
                "content": (
                    f'A reviewer said: "{turn["feedback"]}". Write a better one-sentence reply. '
                    "Reply with ONLY the new sentence itself - no acknowledgement, preamble, "
                    "or meta-commentary such as \"Got it\" or \"Here's a proper disagreement:\"."
                ),
            }
        )
    chunks = [chunk async for chunk in model.astream(messages)]
    full = chunks[0]
    for chunk in chunks[1:]:
        full += chunk
    return {**state, "draft": full.text}


async def _review(model: ChatAnthropic, state: ChallengeState) -> ChallengeState:
    messages = [
        {"role": "system", "content": REVIEWER_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f'User\'s fact: "{state["fact"]}"\nChatbot\'s reply: "{state["draft"]}"',
        },
    ]
    chunks = [chunk async for chunk in model.astream(messages)]
    full = chunks[0]
    for chunk in chunks[1:]:
        full += chunk
    verdict = full.text.strip()
    approved = verdict.upper().startswith("LGTM")
    history = state["history"]
    if not approved:
        history = [*history, {"draft": state["draft"], "feedback": verdict}][-HISTORY_WINDOW:]
    return {
        **state,
        "approved": approved,
        "feedback": None if approved else verdict,
        "iteration": state["iteration"] + 1,
        "history": history,
    }


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

    def route(state: ChallengeState) -> str:
        if state["approved"] or state["iteration"] >= max_loops:
            return "end"
        return "retry"

    graph = StateGraph(ChallengeState)
    graph.add_node("generate", generate_node)
    graph.add_node("review", review_node)

    graph.add_edge(START, "generate")
    graph.add_edge("generate", "review")
    graph.add_conditional_edges("review", route, {"retry": "generate", "end": END})
    return graph.compile()


async def run_challenge_stream(fact: str, settings: Settings) -> AsyncIterator[StreamEvent]:
    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is required for the challenge agent loop")

    app = _compiled_graph(
        settings.anthropic_api_key, settings.agent_model, settings.review_model, settings.max_review_loops
    )
    initial_state: ChallengeState = {
        "fact": fact,
        "draft": "",
        "feedback": None,
        "iteration": 0,
        "approved": False,
        "history": [],
    }

    final_draft = initial_state["draft"]
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
                    if node_name == "review":
                        final_draft = state["draft"]

    complete_event: CompleteEvent = {"type": "complete", "draft": final_draft}
    yield complete_event
