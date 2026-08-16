# USD per million tokens (input, output). Keep in sync with settings.agent_model /
# settings.review_model — Anthropic doesn't expose pricing via the API.
MODEL_PRICING: dict[str, tuple[float, float]] = {
    "claude-haiku-4-5-20251001": (1.00, 5.00),
    "claude-sonnet-4-6": (3.00, 15.00),
}


def call_cost(model_id: str, usage: dict | None) -> float:
    if not usage:
        return 0.0
    pricing = MODEL_PRICING.get(model_id)
    if not pricing:
        return 0.0
    input_price, output_price = pricing
    input_tokens = usage.get("input_tokens", 0)
    output_tokens = usage.get("output_tokens", 0)
    return (input_tokens / 1_000_000) * input_price + (output_tokens / 1_000_000) * output_price
