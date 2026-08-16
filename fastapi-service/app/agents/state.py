from typing import Literal, TypedDict

HISTORY_WINDOW = 3


class ChallengeTurn(TypedDict):
    draft: str
    feedback: str


class ChallengeState(TypedDict):
    input: str
    draft: str
    feedback: str | None
    iteration: int
    approved: bool
    history: list[ChallengeTurn]
    cost: float


class MessageEvent(TypedDict):
    node: Literal["generate", "review"]
    type: Literal["messages"]
    content: str


class UpdateEvent(ChallengeState):
    node: Literal["generate", "review"]
    type: Literal["updates"]


class CompleteEvent(TypedDict):
    type: Literal["complete"]
    draft: str
    cost: float


StreamEvent = MessageEvent | UpdateEvent | CompleteEvent
