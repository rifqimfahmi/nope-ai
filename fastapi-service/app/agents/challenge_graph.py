from collections.abc import AsyncIterator
from functools import lru_cache
from typing import TypedDict

from anthropic import AsyncAnthropic
from langgraph.graph import END, START, StateGraph

from app.config import Settings
from app.prompts import CONTRARIAN_PROMPTS

REVIEWER_SYSTEM_PROMPT = (
    "You review a 'Playful Contrarian' chatbot's reply to a user's fact. The reply must: "
    "(1) cheerfully disagree with the fact, (2) give a simple, common-sense, everyday reason "
    "with no jargon, (3) be a single punchy sentence, (4) never agree with the user. "
    "If the reply satisfies all four rules, respond with exactly: LGTM "
    "Otherwise respond with one short sentence describing what to fix, and nothing else."
)


class ChallengeState(TypedDict):
    fact: str
    draft: str
    feedback: str | None
    iteration: int
    approved: bool


async def _generate(client: AsyncAnthropic, model: str, state: ChallengeState) -> ChallengeState:
    messages = [*CONTRARIAN_PROMPTS, {"role": "user", "content": state["fact"]}]
    if state["feedback"]:
        messages.append(
            {
                "role": "user",
                "content": (
                    f'Your previous reply was: "{state["draft"]}". '
                    f'A reviewer said: "{state["feedback"]}". Write a better one-sentence reply.'
                ),
            }
        )
    system_prompt = next(m["content"] for m in messages if m["role"] == "system")
    chat_messages = [m for m in messages if m["role"] != "system"]

    response = await client.messages.create(
        model=model,
        max_tokens=256,
        temperature=0.9,
        system=system_prompt,
        messages=chat_messages,
    )
    draft = "".join(block.text for block in response.content if block.type == "text")
    return {**state, "draft": draft}


async def _review(client: AsyncAnthropic, model: str, state: ChallengeState) -> ChallengeState:
    response = await client.messages.create(
        model=model,
        max_tokens=100,
        temperature=0,
        system=REVIEWER_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": state["draft"]}],
    )
    verdict = "".join(block.text for block in response.content if block.type == "text").strip()
    approved = verdict.upper().startswith("LGTM")
    return {
        **state,
        "approved": approved,
        "feedback": None if approved else verdict,
        "iteration": state["iteration"] + 1,
    }


@lru_cache
def _compiled_graph(api_key: str, model: str, max_loops: int):
    client = AsyncAnthropic(api_key=api_key)

    async def generate_node(state: ChallengeState) -> ChallengeState:
        return await _generate(client, model, state)

    async def review_node(state: ChallengeState) -> ChallengeState:
        return await _review(client, model, state)

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


async def run_challenge_stream(fact: str, settings: Settings) -> AsyncIterator[dict]:
    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is required for the challenge agent loop")

    app = _compiled_graph(settings.anthropic_api_key, settings.agent_model, settings.max_review_loops)
    initial_state: ChallengeState = {
        "fact": fact,
        "draft": "",
        "feedback": None,
        "iteration": 0,
        "approved": False,
    }

    async for update in app.astream(initial_state, stream_mode="updates"):
        for node_name, node_state in update.items():
            yield {"node": node_name, **node_state}
