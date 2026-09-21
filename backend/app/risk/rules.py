"""Centralized rule-based attendance risk configuration and evaluation."""

from dataclasses import dataclass


@dataclass(frozen=True)
class RiskRules:
    headcount_mismatch_score: float = 30
    pair_affinity_score: float = 35
    pair_min_sessions: int = 5
    pair_close_ratio: float = 0.6
    pair_close_seconds: int = 2


RULES = RiskRules()


def pair_affinity_qualifies(
    sessions_together: int,
    sessions_close: int,
) -> bool:
    return (
        sessions_together >= RULES.pair_min_sessions
        and sessions_close / sessions_together >= RULES.pair_close_ratio
    )
