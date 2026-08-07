from collections.abc import AsyncIterator

from huggingface_hub import AsyncInferenceClient

from app.providers.base import ChatChunk, LLMProvider


class HuggingFaceProvider(LLMProvider):
    """Ports the Next.js route's HF InferenceClient chatCompletionStream call."""

    def __init__(self, token: str, model: str):
        self._client = AsyncInferenceClient(api_key=token)
        self._model = model

    async def stream_completion(self, messages: list[dict[str, str]]) -> AsyncIterator[ChatChunk]:
        stream = await self._client.chat_completion(
            messages=messages,
            model=self._model,
            provider="auto",
            max_tokens=1024,
            temperature=0.9,
            stream=True,
        )
        async for event in stream:
            delta = event.choices[0].delta.content if event.choices else None
            usage = None
            if getattr(event, "usage", None):
                usage = {
                    "inputTokens": event.usage.prompt_tokens,
                    "completionTokens": event.usage.completion_tokens,
                    "totalTokens": event.usage.total_tokens,
                }
            if delta or usage:
                yield ChatChunk(content=delta or "", usage=usage)
