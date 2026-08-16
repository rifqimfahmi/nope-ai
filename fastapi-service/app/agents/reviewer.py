from langchain_anthropic import ChatAnthropic

from app.prompts import REVIEWER_FEWSHOT_MESSAGES, REVIEWER_SYSTEM_PROMPT

from .pricing import call_cost
from .state import HISTORY_WINDOW, ChallengeState

EM_DASH_FEEDBACK = "Drop the em dash, that crutch is banned on your watch."


async def review(model: ChatAnthropic, state: ChallengeState) -> ChallengeState:
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
    cost = call_cost(model.model, full.usage_metadata)
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
