from langchain_anthropic import ChatAnthropic

from app.prompts import CONTRARIAN_PROMPTS, FEEDBACK_REVISION_PROMPT

from .pricing import call_cost
from .state import HISTORY_WINDOW, ChallengeState


async def generate(model: ChatAnthropic, state: ChallengeState) -> ChallengeState:
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
    cost = call_cost(model.model, full.usage_metadata)
    return {**state, "draft": full.text, "cost": state["cost"] + cost}
