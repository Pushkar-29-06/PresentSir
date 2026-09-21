from sqlalchemy import inspect

from app.db import engine
from app.models import assessment_scores
from app.services.phase_g import (
    ASSESSMENT_TYPES,
    EXCUSED_MODES,
    POLICY_SCOPES,
    SCORE_STATUSES,
)


def test_phase_g_tables_are_migrated_without_invented_score_key():
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    assert {
        "assessments",
        "assessment_scores",
        "policies",
        "notifications",
        "refresh_tokens",
    }.issubset(tables)
    assert inspector.get_pk_constraint("assessment_scores")["constrained_columns"] == []
    assert "note" not in {column["name"] for column in inspector.get_columns("policies")}
    assert {"marks", "status"} <= set(assessment_scores.c.keys())


def test_phase_g_status_sets_match_specification():
    assert ASSESSMENT_TYPES == {"ASSIGNMENT", "INTERNAL", "ASSESSMENT"}
    assert SCORE_STATUSES == {"SUBMITTED", "MISSED", "GRADED"}
    assert POLICY_SCOPES == {"GLOBAL", "DEPARTMENT", "COURSE"}
    assert EXCUSED_MODES == {"EXCLUDE", "COUNT_PRESENT"}
