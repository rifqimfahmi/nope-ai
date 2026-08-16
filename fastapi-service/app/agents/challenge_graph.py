from collections.abc import AsyncIterator
from functools import lru_cache
from typing import cast

from langchain_anthropic import ChatAnthropic
from langgraph.graph import END, START, StateGraph
from pydantic import SecretStr

from app.config import Settings

from .generator import generate
from .reviewer import review
from .state import ChallengeState, CompleteEvent, MessageEvent, StreamEvent, UpdateEvent


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
        return await generate(generate_model, state)

    async def review_node(state: ChallengeState) -> ChallengeState:
        return await review(review_model, state)

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
