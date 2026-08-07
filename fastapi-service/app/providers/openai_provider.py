from collections.abc import AsyncIterator

from openai import AsyncOpenAI

from app.providers.base import ChatChunk, LLMProvider


class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str, model: str):
        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model

    async def stream_completion(self, messages: list[dict[str, str]]) -> AsyncIterator[ChatChunk]:
        stream = await self._client.chat.completions.create(
            model=self._model,
            messages=messages,
            max_tokens=1024,
            temperature=0.9,
            stream=True,
            stream_options={"include_usage": True},
        )
        async for event in stream:
            delta = event.choices[0].delta.content if event.choices else None
            usage = None
            if event.usage:
                usage = {
                    "inputTokens": event.usage.prompt_tokens,
                    "completionTokens": event.usage.completion_tokens,
                    "totalTokens": event.usage.total_tokens,
                }
            if delta or usage:
                yield ChatChunk(content=delta or "", usage=usage)
