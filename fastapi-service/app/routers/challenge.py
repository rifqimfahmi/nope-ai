import asyncio
import json
import random
import time
from collections.abc import AsyncIterator

from fastapi import APIRouter
from openinference.semconv.trace import OpenInferenceSpanKindValues, SpanAttributes
from opentelemetry import trace
from sse_starlette.sse import EventSourceResponse

from app.agents.challenge_graph import run_challenge_stream
from app.config import get_settings
from app.phase_lines import GENERATING_LINES, REGENERATING_LINES, REVIEWING_LINES
from app.schemas import ChallengeRequest

router = APIRouter()
tracer = trace.get_tracer(__name__)

MIN_PHASE_DISPLAY_SECONDS = 1.5


def _now_ms() -> int:
    return int(time.time() * 1000)


def _sse(event_type: str, content: str, **extra: object) -> dict[str, str]:
    return {
        "data": json.dumps(
            {
                "type": event_type,
                "content": content,
                "timestamp": _now_ms(),
                **extra,
            }
        )
    }


def _phase(lines: list[str]) -> dict[str, str]:
    return _sse("phase", random.choice(lines))


async def _with_min_display_time(
    events: AsyncIterator[dict[str, str]], seconds: float
) -> AsyncIterator[dict[str, str]]:
    """Space out yields so each one stays on screen for at least `seconds`."""
    last_emit = time.monotonic() - seconds  # don't delay the first event
    async for event in events:
        remaining = seconds - (time.monotonic() - last_emit)
        if remaining > 0:
            await asyncio.sleep(remaining)
        last_emit = time.monotonic()
        yield event


async def _challenge_events(user_input: str) -> AsyncIterator[dict[str, str]]:
    with tracer.start_as_current_span(
        "challenge_me",
        attributes={
            SpanAttributes.OPENINFERENCE_SPAN_KIND: OpenInferenceSpanKindValues.CHAIN.value,
            SpanAttributes.INPUT_VALUE: user_input,
        },
    ) as span:
        try:
            yield _phase(GENERATING_LINES)
            async for update in run_challenge_stream(user_input, get_settings()):
                print(f"stream {update}")
                # if update["type"] == "messages" and update["node"] == "generate":
                #     yield _sse("token", update["content"])
                if update["type"] == "complete":
                    span.set_attribute(SpanAttributes.OUTPUT_VALUE, update["draft"])
                    yield _sse("complete", update["draft"], cost=update["cost"])
                elif update["type"] == "updates":
                    if update["node"] == "generate":
                        yield _phase(REVIEWING_LINES)
                    elif update["node"] == "review" and not update["approved"]:
                        yield _phase(REGENERATING_LINES)
        except Exception as exc:  # noqa: BLE001 - log the real failure, but don't leak internals to the client
            print(f"challenge_me error: {exc}")
            yield _sse("error", "Something went wrong generating a response. Please try again.")


@router.post("/challenge-me")
async def challenge_me(payload: ChallengeRequest) -> EventSourceResponse:
    events = _challenge_events(payload.input)
    return EventSourceResponse(_with_min_display_time(events, MIN_PHASE_DISPLAY_SECONDS))
