from pydantic import BaseModel, Field


class ChallengeRequest(BaseModel):
    fact: str = Field(min_length=1)


class StreamChunk(BaseModel):
    type: str  # "chunk" | "complete" | "error"
    content: str
    timestamp: int
