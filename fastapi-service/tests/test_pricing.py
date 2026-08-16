from app.agents.pricing import MODEL_PRICING, call_cost


class TestCallCost:
    def test_zero_when_usage_missing(self):
        assert call_cost("claude-haiku-4-5-20251001", None) == 0.0

    def test_zero_when_model_not_priced(self):
        usage = {"input_tokens": 1000, "output_tokens": 1000}
        assert call_cost("some-unpriced-model", usage) == 0.0

    def test_computes_cost_from_pricing_table(self):
        model = "claude-haiku-4-5-20251001"
        input_price, output_price = MODEL_PRICING[model]
        usage = {"input_tokens": 1_000_000, "output_tokens": 1_000_000}
        assert call_cost(model, usage) == input_price + output_price

    def test_missing_token_counts_default_to_zero(self):
        model = "claude-haiku-4-5-20251001"
        assert call_cost(model, {}) == 0.0
