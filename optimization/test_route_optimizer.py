"""
Unit tests for CP-SAT route optimizer.

Tests cover:
- Normal case: multiple valid candidates, correct minimum-cost route selected
- Single candidate (bypass case)
- Empty candidate list
- All candidates violate maxTransfers/maxWaitingTime (fallback case)
- Missing delayRisk/reliabilityScore fields (default substitution)
- Config value changes affecting selected outcome (weight sensitivity)
"""

import pytest
import json
import tempfile
import os
from optimization.route_optimizer import (
    load_optimizer_config,
    select_optimal_route,
    _normalize_route_object,
    _is_route_feasible,
    _compute_objective_score
)


# Test fixtures
@pytest.fixture
def default_config():
    """Default optimizer config for tests."""
    return {
        "waitingPenalty": 0.8,
        "transferPenalty": 3600,
        "delayPenalty": 7200,
        "maxTransfers": 3,
        "maxWaitingTime": 7200,
        "missingDelayRiskDefault": 0.5,
        "missingReliabilityScoreDefault": 0.5
    }


@pytest.fixture
def sample_routes():
    """Sample route candidates with varying characteristics."""
    return [
        {
            # Route 1: Fast, direct, but higher delay risk
            "total_duration": 10800,  # 3 hours
            "total_waiting": 0,
            "num_transfers": 0,
            "delayRisk": 0.7,
            "reliabilityScore": 0.6,
            "trains_used": ["12345"],
            "stations_visited": ["SRC", "DST"],
            "segments": [],
            "score": 15000
        },
        {
            # Route 2: Moderate time, one transfer, low delay risk (BEST)
            "total_duration": 14400,  # 4 hours
            "total_waiting": 1800,  # 30 min
            "num_transfers": 1,
            "delayRisk": 0.2,
            "reliabilityScore": 0.9,
            "trains_used": ["12345", "67890"],
            "stations_visited": ["SRC", "MID", "DST"],
            "segments": [],
            "score": 20000
        },
        {
            # Route 3: Slow, multiple transfers, low delay risk
            "total_duration": 18000,  # 5 hours
            "total_waiting": 3600,  # 1 hour
            "num_transfers": 2,
            "delayRisk": 0.1,
            "reliabilityScore": 0.95,
            "trains_used": ["12345", "67890", "11111"],
            "stations_visited": ["SRC", "MID1", "MID2", "DST"],
            "segments": [],
            "score": 30000
        },
    ]


# Config loading tests
def test_load_config_success(tmp_path):
    """Test loading valid config file."""
    config_file = tmp_path / "config.json"
    config_data = {
        "waitingPenalty": 1.0,
        "transferPenalty": 3600,
        "delayPenalty": 7200,
        "maxTransfers": 3,
        "maxWaitingTime": 7200,
        "missingDelayRiskDefault": 0.5,
        "missingReliabilityScoreDefault": 0.5
    }

    with open(config_file, 'w') as f:
        json.dump(config_data, f)

    loaded = load_optimizer_config(str(config_file))
    assert loaded == config_data


def test_load_config_missing_file():
    """Test error on missing config file."""
    with pytest.raises(FileNotFoundError):
        load_optimizer_config("/nonexistent/path.json")


def test_load_config_missing_fields(tmp_path):
    """Test error on incomplete config."""
    config_file = tmp_path / "config.json"
    incomplete_config = {
        "waitingPenalty": 1.0,
        "transferPenalty": 3600
        # Missing other required fields
    }

    with open(config_file, 'w') as f:
        json.dump(incomplete_config, f)

    with pytest.raises(ValueError, match="Missing required config fields"):
        load_optimizer_config(str(config_file))


def test_load_config_invalid_values(tmp_path):
    """Test error on invalid config values."""
    config_file = tmp_path / "config.json"

    # Invalid maxTransfers
    config_data = {
        "waitingPenalty": 1.0,
        "transferPenalty": 3600,
        "delayPenalty": 7200,
        "maxTransfers": -1,  # Invalid
        "maxWaitingTime": 7200,
        "missingDelayRiskDefault": 0.5,
        "missingReliabilityScoreDefault": 0.5
    }

    with open(config_file, 'w') as f:
        json.dump(config_data, f)

    with pytest.raises(ValueError, match="maxTransfers must be >= 0"):
        load_optimizer_config(str(config_file))


# Route normalization tests
def test_normalize_route_canonical_names(default_config):
    """Test normalization with canonical field names."""
    route = {
        "travelTime": 10800,
        "waitingTime": 1800,
        "transfers": 1,
        "delayRisk": 0.3,
        "reliabilityScore": 0.8,
        "trains": ["12345"],
        "stations": ["SRC", "DST"]
    }

    normalized = _normalize_route_object(route, default_config)

    assert normalized["travelTime"] == 10800
    assert normalized["waitingTime"] == 1800
    assert normalized["transfers"] == 1
    assert normalized["delayRisk"] == 0.3
    assert normalized["reliabilityScore"] == 0.8
    assert normalized["trains"] == ["12345"]
    assert normalized["stations"] == ["SRC", "DST"]


def test_normalize_route_alternative_names(default_config):
    """Test normalization with alternative field names (e.g., from existing pipeline)."""
    route = {
        "total_duration": 10800,
        "total_waiting": 1800,
        "num_transfers": 1,
        "delay_risk": 0.3,
        "reliability_score": 0.8,
        "trains_used": ["12345"],
        "stations_visited": ["SRC", "DST"]
    }

    normalized = _normalize_route_object(route, default_config)

    assert normalized["travelTime"] == 10800
    assert normalized["waitingTime"] == 1800
    assert normalized["transfers"] == 1
    assert normalized["delayRisk"] == 0.3
    assert normalized["reliabilityScore"] == 0.8
    assert normalized["trains"] == ["12345"]
    assert normalized["stations"] == ["SRC", "DST"]


def test_normalize_route_missing_delay_fields(default_config):
    """Test normalization with missing delayRisk/reliabilityScore (should use defaults)."""
    route = {
        "total_duration": 10800,
        "total_waiting": 1800,
        "num_transfers": 1,
        # delayRisk and reliabilityScore missing
        "trains_used": ["12345"],
        "stations_visited": ["SRC", "DST"]
    }

    normalized = _normalize_route_object(route, default_config)

    assert normalized["delayRisk"] == default_config["missingDelayRiskDefault"]
    assert normalized["reliabilityScore"] == default_config["missingReliabilityScoreDefault"]


def test_normalize_route_null_delay_fields(default_config):
    """Test normalization with null delayRisk/reliabilityScore (should use defaults)."""
    route = {
        "total_duration": 10800,
        "total_waiting": 1800,
        "num_transfers": 1,
        "delayRisk": None,  # Explicitly null (e.g., n8n call failed)
        "reliabilityScore": None,
        "trains_used": ["12345"],
        "stations_visited": ["SRC", "DST"]
    }

    normalized = _normalize_route_object(route, default_config)

    assert normalized["delayRisk"] == default_config["missingDelayRiskDefault"]
    assert normalized["reliabilityScore"] == default_config["missingReliabilityScoreDefault"]


def test_normalize_route_missing_required_fields(default_config):
    """Test error on missing required fields."""
    route = {
        "total_waiting": 1800,
        "num_transfers": 1,
        # Missing total_duration (required)
    }

    with pytest.raises(ValueError, match="missing travelTime"):
        _normalize_route_object(route, default_config)


# Feasibility tests
def test_is_route_feasible_valid():
    """Test feasibility check on valid route."""
    route = {
        "travelTime": 10800,
        "waitingTime": 1800,
        "transfers": 1,
        "trains": ["12345"],
        "stations": ["SRC", "DST"]
    }

    feasible, reason = _is_route_feasible(route)
    assert feasible is True
    assert reason is None


def test_is_route_feasible_zero_travel_time():
    """Test infeasibility on zero/negative travel time."""
    route = {
        "travelTime": 0,  # Invalid
        "waitingTime": 1800,
        "transfers": 1,
        "trains": ["12345"],
        "stations": ["SRC", "DST"]
    }

    feasible, reason = _is_route_feasible(route)
    assert feasible is False
    assert "travelTime" in reason


def test_is_route_feasible_no_trains():
    """Test infeasibility on empty trains list."""
    route = {
        "travelTime": 10800,
        "waitingTime": 1800,
        "transfers": 1,
        "trains": [],  # Invalid
        "stations": ["SRC", "DST"]
    }

    feasible, reason = _is_route_feasible(route)
    assert feasible is False
    assert "train" in reason


def test_is_route_feasible_insufficient_stations():
    """Test infeasibility on < 2 stations."""
    route = {
        "travelTime": 10800,
        "waitingTime": 1800,
        "transfers": 1,
        "trains": ["12345"],
        "stations": ["SRC"]  # Invalid (need at least 2)
    }

    feasible, reason = _is_route_feasible(route)
    assert feasible is False
    assert "stations" in reason


# Objective score computation tests
def test_compute_objective_score(default_config):
    """Test objective score computation formula."""
    route = {
        "travelTime": 10800,  # 3 hours = 10800 sec
        "waitingTime": 1800,  # 30 min = 1800 sec
        "transfers": 1,
        "delayRisk": 0.5
    }

    score = _compute_objective_score(route, default_config)

    # Expected: 10800 + 1800*0.8 + 1*3600 + 0.5*7200
    expected = 10800 + 1800 * 0.8 + 1 * 3600 + 0.5 * 7200
    assert abs(score - expected) < 1e-6


# Main optimizer tests
def test_select_optimal_route_normal_case(default_config, sample_routes):
    """Test normal case: multiple valid candidates, select minimum-cost route."""
    selected, metadata = select_optimal_route(sample_routes, default_config)

    assert selected is not None
    assert metadata["status"] in ["optimal", "feasible"]
    assert metadata["candidates_evaluated"] == 3
    assert metadata["candidates_feasible"] == 3

    # Route 1 should win (fastest, despite higher delay risk)
    # Objective scores: Route 1=15840, Route 2=20880, Route 3=28800
    # Route 1 has lowest total cost even with delayRisk penalty
    assert selected["trains_used"] == ["12345"]


def test_select_optimal_route_empty_list(default_config):
    """Test empty candidate list (edge case)."""
    selected, metadata = select_optimal_route([], default_config)

    assert selected is None
    assert metadata["status"] == "no_candidates"
    assert metadata["candidates_evaluated"] == 0


def test_select_optimal_route_single_candidate(default_config):
    """Test single candidate (bypass CP-SAT, trivial selection)."""
    routes = [
        {
            "total_duration": 10800,
            "total_waiting": 0,
            "num_transfers": 0,
            "delayRisk": 0.5,
            "trains_used": ["12345"],
            "stations_visited": ["SRC", "DST"]
        }
    ]

    selected, metadata = select_optimal_route(routes, default_config)

    assert selected is not None
    assert metadata["status"] == "single_candidate"
    assert selected["trains_used"] == ["12345"]


def test_select_optimal_route_all_violate_max_transfers(default_config):
    """Test all candidates violate maxTransfers (fallback to best score)."""
    routes = [
        {
            "total_duration": 10800,
            "total_waiting": 1800,
            "num_transfers": 5,  # Exceeds maxTransfers=3
            "delayRisk": 0.2,
            "trains_used": ["A", "B", "C", "D", "E", "F"],
            "stations_visited": ["SRC", "M1", "M2", "M3", "M4", "M5", "DST"]
        },
        {
            "total_duration": 14400,
            "total_waiting": 2400,
            "num_transfers": 4,  # Exceeds maxTransfers=3
            "delayRisk": 0.3,
            "trains_used": ["A", "B", "C", "D", "E"],
            "stations_visited": ["SRC", "M1", "M2", "M3", "M4", "DST"]
        },
    ]

    selected, metadata = select_optimal_route(routes, default_config)

    # Should fall back to best objective score despite constraint violations
    assert selected is not None
    assert metadata["status"] == "infeasible_relaxed"
    # First route has lower travel time, should be selected
    assert selected["trains_used"] == ["A", "B", "C", "D", "E", "F"]


def test_select_optimal_route_all_violate_max_waiting(default_config):
    """Test all candidates violate maxWaitingTime (fallback to best score)."""
    routes = [
        {
            "total_duration": 10800,
            "total_waiting": 10800,  # 3 hours, exceeds maxWaitingTime=7200 (2 hours)
            "num_transfers": 1,
            "delayRisk": 0.2,
            "trains_used": ["A", "B"],
            "stations_visited": ["SRC", "MID", "DST"]
        },
        {
            "total_duration": 14400,
            "total_waiting": 14400,  # 4 hours, exceeds maxWaitingTime
            "delayRisk": 0.3,
            "trains_used": ["C", "D"],
            "stations_visited": ["SRC", "MID", "DST"]
        },
    ]

    selected, metadata = select_optimal_route(routes, default_config)

    assert selected is not None
    assert metadata["status"] == "infeasible_relaxed"
    # First route has lower total score
    assert selected["trains_used"] == ["A", "B"]


def test_select_optimal_route_missing_delay_fields(default_config):
    """Test routes with missing delayRisk/reliabilityScore use defaults."""
    routes = [
        {
            "total_duration": 10800,
            "total_waiting": 1800,
            "num_transfers": 1,
            # delayRisk missing — will use default 0.5
            "trains_used": ["A"],
            "stations_visited": ["SRC", "DST"]
        },
        {
            "total_duration": 10800,
            "total_waiting": 1800,
            "num_transfers": 1,
            "delayRisk": 0.1,  # Explicitly low
            "trains_used": ["B"],
            "stations_visited": ["SRC", "DST"]
        },
    ]

    selected, metadata = select_optimal_route(routes, default_config)

    assert selected is not None
    # Route 2 should win (lower delay risk)
    assert selected["trains_used"] == ["B"]


def test_select_optimal_route_config_changes_outcome(sample_routes):
    """Test that changing config weights changes selected route."""
    # Config 1: Very high delay penalty (should favor Route 3 with delayRisk=0.1)
    # Need to make delayPenalty high enough to overcome Route 1's speed advantage
    config_high_delay = {
        "waitingPenalty": 0.8,
        "transferPenalty": 3600,
        "delayPenalty": 50000,  # Extremely high to overcome 7200 second difference
        "maxTransfers": 3,
        "maxWaitingTime": 7200,
        "missingDelayRiskDefault": 0.5,
        "missingReliabilityScoreDefault": 0.5
    }

    selected1, meta1 = select_optimal_route(sample_routes, config_high_delay)

    # With delayPenalty=50000:
    # Route 1: 10800 + 0*0.8 + 0*3600 + 0.7*50000 = 45800
    # Route 2: 14400 + 1800*0.8 + 1*3600 + 0.2*50000 = 29440
    # Route 3: 18000 + 3600*0.8 + 2*3600 + 0.1*50000 = 32080
    # Route 2 should win
    assert selected1["trains_used"] == ["12345", "67890"]

    # Config 2: Very high transfer penalty (favors direct routes)
    config_high_transfer = {
        "waitingPenalty": 0.8,
        "transferPenalty": 15000,  # Very high
        "delayPenalty": 1000,  # Low
        "maxTransfers": 3,
        "maxWaitingTime": 7200,
        "missingDelayRiskDefault": 0.5,
        "missingReliabilityScoreDefault": 0.5
    }

    selected2, meta2 = select_optimal_route(sample_routes, config_high_transfer)

    # Should select Route 1 (0 transfers)
    assert selected2["trains_used"] == ["12345"]

    # Verify different routes selected with different configs
    assert selected1["trains_used"] != selected2["trains_used"]


def test_select_optimal_route_output_shape_unchanged(default_config, sample_routes):
    """Test that output route preserves input shape (no fields added/removed)."""
    selected, metadata = select_optimal_route(sample_routes, default_config)

    # Check that selected route is one of the original input routes (same object reference or shape)
    assert selected in sample_routes

    # Check no extra fields added by optimizer
    original_keys = set(sample_routes[0].keys())
    selected_keys = set(selected.keys())
    assert selected_keys == original_keys


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v"])
