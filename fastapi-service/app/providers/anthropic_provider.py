from collections.abc import AsyncIterator

from anthropic import AsyncAnthropic

from app.providers.base import ChatChunk, LLMProvider


class AnthropicProvider(LLMProvider):
    def __init__(self, api_key: str, model: str):
        self._client = AsyncAnthropic(api_key=api_key)
        self._model = model

    async def stream_completion(self, messages: list[dict[str, str]]) -> AsyncIterator[ChatChunk]:
        system_prompt = next((m["content"] for m in messages if m["role"] == "system"), None)
        chat_messages = [m for m in messages if m["role"] != "system"]

        async with self._client.messages.stream(
            model=self._model,
            max_tokens=1024,
            temperature=0.9,
            system=system_prompt,
            messages=chat_messages,
        ) as stream:
            async for text in stream.text_stream:
                yield ChatChunk(content=text)

            final = await stream.get_final_message()
            yield ChatChunk(
                content="",
                usage={
                    "inputTokens": final.usage.input_tokens,
                    "completionTokens": final.usage.output_tokens,
                    "totalTokens": final.usage.input_tokens + final.usage.output_tokens,
                },
            )
