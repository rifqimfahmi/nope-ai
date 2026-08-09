import json
import time
from collections.abc import AsyncIterator

from fastapi import APIRouter
from opentelemetry import trace
from sse_starlette.sse import EventSourceResponse

from app.agents.challenge_graph import run_challenge_stream
from app.config import get_settings
from app.schemas import ChallengeRequest

router = APIRouter()
tracer = trace.get_tracer(__name__)

PHASE_GENERATING = "generating"
PHASE_REVIEWING = "reviewing"


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
        with tracer.start_as_current_span("challenge_me"):
            try:
                yield _sse("phase", PHASE_GENERATING)
                async for update in run_challenge_stream(payload.fact, get_settings()):
                    print(f"stream {update}")
                    if update["type"] == "messages" and update["node"] == "generate":
                        yield _sse("token", update["content"])
                    elif update["type"] == "complete":
                        yield _sse("complete", update["draft"])
                    elif update["type"] == "updates":
                        if update["node"] == "generate":
                            yield _sse("phase", PHASE_REVIEWING)
                        elif update["node"] == "review" and not update["approved"]:
                            yield _sse("phase", PHASE_GENERATING)
            except Exception as exc:  # noqa: BLE001 - surface any agent failure as an SSE error event
                yield _sse("error", str(exc))

    return EventSourceResponse(event_generator())
