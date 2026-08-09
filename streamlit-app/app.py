import json
import os

import requests
import streamlit as st

FASTAPI_URL = os.environ.get("FASTAPI_URL", "http://localhost:8000")

st.set_page_config(page_title="Contrarian Agent - Test Console", page_icon="🧐")
st.title("🧐 Contrarian Agent - Test Console")
st.caption(f"Talking to FastAPI service at {FASTAPI_URL}")

fact = st.text_input("Say something you believe is true:", placeholder="Water is wet.")
go = st.button("Challenge me", type="primary", disabled=not fact)

if go:
    output_box = st.empty()
    complete_text = ""
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
                    continuke
                event = json.loads(line[len("data:") :].strip())

                if event["type"] == "chunk":
                    complete_text += event["content"]
                    output_box.markdown(complete_text + "▌")
                elif event["type"] == "complete":
                    complete_text = event["content"]
                    output_box.markdown(complete_text)
                elif event["type"] == "error":
                    error_text = event["content"]
    except requests.exceptions.RequestException as exc:
        error_text = str(exc)

    if error_text:
        st.error(error_text)
