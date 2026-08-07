from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from dataclasses import dataclass


@dataclass
class ChatChunk:
    content: str
    usage: dict[str, int] | None = None


class LLMProvider(ABC):
    """A chat-completion backend that can stream a contrarian reply."""

    @abstractmethod
    def stream_completion(self, messages: list[dict[str, str]]) -> AsyncIterator[ChatChunk]:
        """Stream chat completion chunks for the given messages (system + few-shot + user)."""
        raise NotImplementedError
