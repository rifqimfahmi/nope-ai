import json
import time
from collections.abc import AsyncIterator

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from app.agents.challenge_graph import run_challenge_stream
from app.config import get_settings
from app.schemas import ChallengeRequest

router = APIRouter()


def _now_ms() -> int:
    return int(time.time() * 1000)


def _sse(event_type: str, content: str) -> dict[str, str]:
    return {
        "data": json.dumps(
            {
                "type": event_type,
                "content": content,
                "timestamp": _now_ms(),
            }
        )
    }


@router.post("/challenge-me")
async def challenge_me(payload: ChallengeRequest) -> EventSourceResponse:
    async def event_generator() -> AsyncIterator[dict[str, str]]:
        try:
            final_draft = ""
            async for update in run_challenge_stream(payload.fact, get_settings()):
                if update["node"] == "generate":
                    final_draft = update["draft"]
                    if update["feedback"]:
                        yield _sse("chunk", f'Revising based on feedback: "{final_draft}"')
                    else:
                        yield _sse("chunk", f'Drafting a reply: "{final_draft}"')
                elif update["node"] == "review":
                    if update["approved"]:
                        yield _sse("chunk", "Review passed.")
                    else:
                        yield _sse("chunk", f'Review requested changes: "{update["feedback"]}"')
            yield _sse("complete", final_draft)
        except Exception as exc:  # noqa: BLE001 - surface any agent failure as an SSE error event
            yield _sse("error", str(exc))

    return EventSourceResponse(event_generator())
