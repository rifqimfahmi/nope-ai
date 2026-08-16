from app.agents.challenge_graph import MODEL_PRICING, ChallengeState, _call_cost, _route


def _state(**overrides) -> ChallengeState:
    base: ChallengeState = {
        "input": "the sky is blue",
        "draft": "draft",
        "feedback": None,
        "iteration": 0,
        "approved": False,
        "history": [],
        "cost": 0.0,
    }
    base.update(overrides)
    return base


class TestRoute:
    def test_ends_when_approved(self):
        assert _route(_state(approved=True, iteration=0), max_loops=6) == "end"

    def test_ends_when_max_loops_reached(self):
        assert _route(_state(approved=False, iteration=6), max_loops=6) == "end"

    def test_retries_when_rejected_and_under_loop_limit(self):
        assert _route(_state(approved=False, iteration=2), max_loops=6) == "retry"

    def test_approved_takes_priority_over_loop_count(self):
        assert _route(_state(approved=True, iteration=6), max_loops=6) == "end"


class TestCallCost:
    def test_zero_when_usage_missing(self):
        assert _call_cost("claude-haiku-4-5-20251001", None) == 0.0

    def test_zero_when_model_not_priced(self):
        usage = {"input_tokens": 1000, "output_tokens": 1000}
        assert _call_cost("some-unpriced-model", usage) == 0.0

    def test_computes_cost_from_pricing_table(self):
        model = "claude-haiku-4-5-20251001"
        input_price, output_price = MODEL_PRICING[model]
        usage = {"input_tokens": 1_000_000, "output_tokens": 1_000_000}
        assert _call_cost(model, usage) == input_price + output_price

    def test_missing_token_counts_default_to_zero(self):
        model = "claude-haiku-4-5-20251001"
        assert _call_cost(model, {}) == 0.0
