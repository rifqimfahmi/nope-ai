import json
import os
from typing import Literal, TypedDict, cast

import requests
import streamlit as st

FASTAPI_URL = os.environ.get("FASTAPI_URL", "http://localhost:8000")


class PhaseEvent(TypedDict):
    type: Literal["phase"]
    content: str


class TokenEvent(TypedDict):
    type: Literal["token"]
    content: str


class CompleteEvent(TypedDict):
    type: Literal["complete"]
    content: str


class ErrorEvent(TypedDict):
    type: Literal["error"]
    content: str


SseEvent = PhaseEvent | TokenEvent | CompleteEvent | ErrorEvent

st.set_page_config(page_title="Contrarian Agent - Test Console", page_icon="🧐")
st.title("🧐 Contrarian Agent - Test Console")
st.caption(f"Talking to FastAPI service at {FASTAPI_URL}")

fact = st.text_input("Say something you believe is true:", placeholder="Water is wet.")
go = st.button("Challenge me", type="primary", disabled=not fact)

PHASE_LABELS = {"generating": "Generating...", "reviewing": "Reviewing..."}

if go:
    with st.status(PHASE_LABELS["generating"], expanded=True) as status:
        answer_box = st.empty()
        answer_text = ""
        error_text = None

        try:
            with requests.post(
                f"{FASTAPI_URL}/challenge-me",
                json={"fact": fact},
                stream=True,
                timeout=60,
            ) as response:
                response.raise_for_status()
                for line in response.iter_lines(decode_unicode=True):
                    if not line or not line.startswith("data:"):
                        continue
                    event = cast(SseEvent, json.loads(line[len("data:") :].strip()))
                    print(f"stream {line}")

                    if event["type"] == "phase":
                        if event["content"] == "generating":
                            answer_text = ""
                            answer_box.empty()
                        status.update(label=PHASE_LABELS[event["content"]])
                    elif event["type"] == "token":
                        answer_text += event["content"]
                        answer_box.markdown(f"**{answer_text}▌**")
                    elif event["type"] == "complete":
                        answer_text = event["content"]
                        answer_box.markdown(f"**{answer_text}**")
                        status.update(label="Done!", state="complete", expanded=False)
                    elif event["type"] == "error":
                        error_text = event["content"]
                        status.update(label="Error", state="error")
        except requests.exceptions.RequestException as exc:
            error_text = str(exc)
            status.update(label="Error", state="error")

    if error_text:
        st.error(error_text)
