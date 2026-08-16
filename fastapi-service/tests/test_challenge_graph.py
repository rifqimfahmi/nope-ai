from app.agents.challenge_graph import _route
from app.agents.state import ChallengeState


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
