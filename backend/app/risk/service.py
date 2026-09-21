from collections.abc import Sequence

from app.risk.rules import RULES, pair_affinity_qualifies


def headcount_mismatch(reported: int | None, present: int) -> bool:
    return reported is not None and reported != present


def pair_affinity_flag(
    sessions_together: int,
    sessions_close: int,
) -> bool:
    return pair_affinity_qualifies(sessions_together, sessions_close)


def risk_summary(scores: Sequence[float | None]) -> dict[str, float | int]:
    values = [score for score in scores if score is not None]
    return {
        "count": len(values),
        "total_score": sum(values),
        "average_score": sum(values) / len(values) if values else 0,
    }


__all__ = ["RULES", "headcount_mismatch", "pair_affinity_flag", "risk_summary"]
