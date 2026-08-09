from collections.abc import AsyncIterator
from functools import lru_cache
from typing import TypedDict

from langchain_anthropic import ChatAnthropic
from langgraph.graph import END, START, StateGraph
from pydantic import SecretStr

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


async def _generate(model: ChatAnthropic, state: ChallengeState) -> ChallengeState:
    messages = [*CONTRARIAN_PROMPTS, {"role": "user", "content": state["fact"]}]
    if state["feedback"]:
        messages.append({"role": "assistant", "content": state["draft"]})
        messages.append(
            {
                "role": "user",
                "content": f'A reviewer said: "{state["feedback"]}". Write a better one-sentence reply.',
            }
        )
    response = await model.ainvoke(messages)
    return {**state, "draft": response.text}


async def _review(model: ChatAnthropic, state: ChallengeState) -> ChallengeState:
    response = await model.ainvoke(
        [
            {"role": "system", "content": REVIEWER_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f'User\'s fact: "{state["fact"]}"\nChatbot\'s reply: "{state["draft"]}"',
            },
        ]
    )
    verdict = response.text.strip()
    approved = verdict.upper().startswith("LGTM")
    return {
        **state,
        "approved": approved,
        "feedback": None if approved else verdict,
        "iteration": state["iteration"] + 1,
    }


@lru_cache
def _compiled_graph(api_key: str, model: str, max_loops: int):
    secret_api_key = SecretStr(api_key)
    generate_model = ChatAnthropic(
        model_name=model, api_key=secret_api_key, temperature=0.9, max_tokens_to_sample=256, timeout=None, stop=None
    )
    review_model = ChatAnthropic(
        model_name=model, api_key=secret_api_key, temperature=0, max_tokens_to_sample=100, timeout=None, stop=None
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
