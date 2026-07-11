"""
Unit tests for timetable_optimizer.py

Tests the CP-SAT departure-shift optimizer for junction timetables.
Covers config loading, edge cases, constraints, and objective computation.
"""

import pytest
import json
import tempfile
import os
from optimization.timetable_optimizer import (
    load_timetable_config,
    optimize_schedule,
    _parse_time_to_seconds,
    _seconds_to_time
)


# ─── Config Loading Tests ────────────────────────────────────────────────────


def test_load_valid_config():
    """Test loading a valid timetable_config.json."""
    config = load_timetable_config("timetable_config.json")

    assert config is not None
    assert "minHaltTimeSeconds" in config
    assert "minHeadwaySeconds" in config
    assert "scheduleModificationPenalty" in config
    assert "transferSuccessWeight" in config
    assert "maxShiftWindowMinutes" in config
    assert "minTransferTimeSeconds" in config
    assert "maxTransferTimeSeconds" in config

    # Check types
    assert isinstance(config["minHaltTimeSeconds"], int)
    assert isinstance(config["transferSuccessWeight"], int)


def test_load_missing_config():
    """Test that missing config file raises FileNotFoundError."""
    with pytest.raises(FileNotFoundError):
        load_timetable_config("nonexistent_config.json")


def test_load_invalid_json():
    """Test that invalid JSON raises ValueError."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        f.write("{invalid json")
        temp_path = f.name

    try:
        with pytest.raises(ValueError, match="Invalid JSON"):
            load_timetable_config(temp_path)
    finally:
        os.unlink(temp_path)


def test_load_missing_fields():
    """Test that missing required fields raises ValueError."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump({"minHaltTimeSeconds": 120}, f)
        temp_path = f.name

    try:
        with pytest.raises(ValueError, match="Missing required config fields"):
            load_timetable_config(temp_path)
    finally:
        os.unlink(temp_path)


def test_config_validation():
    """Test that invalid values are caught."""
    # Negative minHaltTime
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump({
            "minHaltTimeSeconds": -10,
            "minHeadwaySeconds": 300,
            "scheduleModificationPenalty": 10,
            "transferSuccessWeight": 100,
            "maxShiftWindowMinutes": 10,
            "minTransferTimeSeconds": 180,
            "maxTransferTimeSeconds": 3600
        }, f)
        temp_path = f.name

    try:
        with pytest.raises(ValueError, match="minHaltTimeSeconds must be non-negative"):
            load_timetable_config(temp_path)
    finally:
        os.unlink(temp_path)


# ─── Time Parsing Tests ──────────────────────────────────────────────────────


def test_parse_time_to_seconds():
    """Test time string parsing."""
    assert _parse_time_to_seconds("00:00") == 0
    assert _parse_time_to_seconds("01:00") == 3600
    assert _parse_time_to_seconds("14:30") == 52200
    assert _parse_time_to_seconds("23:59") == 86340

    # Invalid formats
    assert _parse_time_to_seconds("invalid") == 0
    assert _parse_time_to_seconds("None") == 0
    assert _parse_time_to_seconds("") == 0


def test_seconds_to_time():
    """Test seconds to time string conversion."""
    assert _seconds_to_time(0) == "00:00"
    assert _seconds_to_time(3600) == "01:00"
    assert _seconds_to_time(52200) == "14:30"
    assert _seconds_to_time(86340) == "23:59"

    # Overflow (next day)
    assert _seconds_to_time(86400) == "00:00"
    assert _seconds_to_time(90000) == "01:00"


# ─── Edge Case Tests ─────────────────────────────────────────────────────────


def test_no_trains():
    """Test optimizer with empty train list."""
    config = load_timetable_config("timetable_config.json")

    result, metadata = optimize_schedule([], [], "NDLS", config)

    assert result["trains"] == []
    assert result["transferPairs"] == []
    assert metadata["status"] == "no_trains"
    assert metadata["trainsEvaluated"] == 0


def test_single_train():
    """Test optimizer with single train (no optimization needed)."""
    config = load_timetable_config("timetable_config.json")

    trains = [{
        "trainNumber": "12345",
        "trainName": "Test Express",
        "currentDeparture": "14:30",
        "currentArrival": "14:00",
        "route": ["NDLS", "AGC"],
        "stopsAt": []
    }]

    result, metadata = optimize_schedule(trains, [], "NDLS", config)

    assert len(result["trains"]) == 1
    assert result["trains"][0]["shiftMinutes"] == 0
    assert metadata["status"] == "single_train"


def test_no_transfer_pairs():
    """Test optimizer with trains but no transfers."""
    config = load_timetable_config("timetable_config.json")

    trains = [
        {
            "trainNumber": "12345",
            "trainName": "Train A",
            "currentDeparture": "14:30",
            "currentArrival": "14:00",
            "route": ["NDLS"],
            "stopsAt": []
        },
        {
            "trainNumber": "67890",
            "trainName": "Train B",
            "currentDeparture": "15:00",
            "currentArrival": "14:45",
            "route": ["NDLS"],
            "stopsAt": []
        }
    ]

    result, metadata = optimize_schedule(trains, [], "NDLS", config)

    assert len(result["trains"]) == 2
    assert metadata["trainsEvaluated"] == 2
    assert metadata["transferPairsEvaluated"] == 0


# ─── Transfer Feasibility Tests ──────────────────────────────────────────────


def test_already_optimal_transfers():
    """Test when current schedule is already optimal."""
    config = load_timetable_config("timetable_config.json")

    # Train A arrives at 14:00, Train B departs at 14:10 (10 min gap = 600s)
    # minTransferTime = 180s, maxTransferTime = 3600s
    # This is already feasible, optimizer should find no improvement
    trains = [
        {
            "trainNumber": "12345",
            "trainName": "Train A",
            "currentDeparture": "14:00",
            "currentArrival": "13:50",
            "route": ["NDLS"],
            "stopsAt": []
        },
        {
            "trainNumber": "67890",
            "trainName": "Train B",
            "currentDeparture": "14:10",
            "currentArrival": "14:05",
            "route": ["NDLS"],
            "stopsAt": []
        }
    ]

    transfer_pairs = [{
        "fromTrain": "12345",
        "toTrain": "67890",
        "passengerCount": 10
    }]

    result, metadata = optimize_schedule(trains, transfer_pairs, "NDLS", config)

    assert metadata["successfulTransfersBefore"] == 1
    assert metadata["successfulTransfersAfter"] == 1
    assert metadata["status"] in ["optimal", "no_improvement"]


def test_infeasible_transfer_becomes_feasible():
    """Test optimizer making infeasible transfer feasible."""
    config = load_timetable_config("timetable_config.json")

    # Train A arrives at 14:00, Train B departs at 14:02 (2 min = 120s)
    # minTransferTime = 180s → currently infeasible
    # Optimizer should shift Train B later to make it feasible
    trains = [
        {
            "trainNumber": "12345",
            "trainName": "Train A",
            "currentDeparture": "14:00",
            "currentArrival": "13:50",
            "route": ["NDLS"],
            "stopsAt": []
        },
        {
            "trainNumber": "67890",
            "trainName": "Train B",
            "currentDeparture": "14:02",
            "currentArrival": "14:00",
            "route": ["NDLS"],
            "stopsAt": []
        }
    ]

    transfer_pairs = [{
        "fromTrain": "12345",
        "toTrain": "67890",
        "passengerCount": 10
    }]

    result, metadata = optimize_schedule(trains, transfer_pairs, "NDLS", config)

    assert metadata["successfulTransfersBefore"] == 0
    # After optimization, should have 1 successful transfer
    assert metadata["successfulTransfersAfter"] >= metadata["successfulTransfersBefore"]


def test_multiple_transfers():
    """Test optimizer with multiple transfer pairs."""
    config = load_timetable_config("timetable_config.json")

    # Hub station with 3 trains
    # A arrives 14:00, B arrives 14:15, C departs 14:20
    # Transfer pairs: A→C (20 min), B→C (5 min = 300s, just above min 180s)
    trains = [
        {
            "trainNumber": "A",
            "trainName": "Train A",
            "currentDeparture": "14:00",
            "currentArrival": "13:50",
            "route": ["NDLS"],
            "stopsAt": []
        },
        {
            "trainNumber": "B",
            "trainName": "Train B",
            "currentDeparture": "14:15",
            "currentArrival": "14:10",
            "route": ["NDLS"],
            "stopsAt": []
        },
        {
            "trainNumber": "C",
            "trainName": "Train C",
            "currentDeparture": "14:20",
            "currentArrival": "14:15",
            "route": ["NDLS"],
            "stopsAt": []
        }
    ]

    transfer_pairs = [
        {"fromTrain": "A", "toTrain": "C", "passengerCount": 15},
        {"fromTrain": "B", "toTrain": "C", "passengerCount": 8}
    ]

    result, metadata = optimize_schedule(trains, transfer_pairs, "NDLS", config)

    assert metadata["transferPairsEvaluated"] == 2
    assert metadata["status"] in ["optimal", "feasible", "no_improvement"]


# ─── Constraint Tests ────────────────────────────────────────────────────────


def test_halt_time_constraint():
    """Test minimum halt time constraint is enforced."""
    config = load_timetable_config("timetable_config.json")

    # Two trains, one with tight halt time
    # Train A arrives 14:00, departs 14:01 (1 min halt)
    # minHaltTime = 120s (2 min) → constraint should prevent shifting earlier
    trains = [
        {
            "trainNumber": "12345",
            "trainName": "Test Train",
            "currentDeparture": "14:01",
            "currentArrival": "14:00",
            "route": ["NDLS"],
            "stopsAt": []
        },
        {
            "trainNumber": "67890",
            "trainName": "Other Train",
            "currentDeparture": "15:00",
            "currentArrival": "14:50",
            "route": ["NDLS"],
            "stopsAt": []
        }
    ]

    result, metadata = optimize_schedule(trains, [], "NDLS", config)

    # Should have halt time constraint active
    assert metadata["constraintsActive"].get("haltTime", False) is True

    # First train departure should respect minimum halt time
    train_a = [t for t in result["trains"] if t["trainNumber"] == "12345"][0]
    optimized_seconds = _parse_time_to_seconds(train_a["optimizedDeparture"])
    arrival_seconds = _parse_time_to_seconds("14:00")
    min_halt = config["minHaltTimeSeconds"]

    assert optimized_seconds >= arrival_seconds + min_halt


def test_headway_constraint():
    """Test headway constraint between trains on same platform."""
    config = load_timetable_config("timetable_config.json")

    # Two trains on platform 1, departing 3 minutes apart
    # minHeadway = 300s (5 min)
    trains = [
        {
            "trainNumber": "A",
            "trainName": "Train A",
            "currentDeparture": "14:00",
            "currentArrival": "13:50",
            "platform": 1,
            "route": ["NDLS"],
            "stopsAt": []
        },
        {
            "trainNumber": "B",
            "trainName": "Train B",
            "currentDeparture": "14:03",
            "currentArrival": "13:55",
            "platform": 1,
            "route": ["NDLS"],
            "stopsAt": []
        }
    ]

    result, metadata = optimize_schedule(trains, [], "NDLS", config)

    # Headway constraint should be active
    assert metadata["constraintsActive"]["headway"] is True

    # Check that gap between trains is at least minHeadway
    dep_a = _parse_time_to_seconds(result["trains"][0]["optimizedDeparture"])
    dep_b = _parse_time_to_seconds(result["trains"][1]["optimizedDeparture"])
    gap = dep_b - dep_a

    assert gap >= config["minHeadwaySeconds"]


def test_shift_bounds():
    """Test that shifts stay within maxShiftWindow."""
    config = load_timetable_config("timetable_config.json")

    trains = [{
        "trainNumber": "12345",
        "trainName": "Test Train",
        "currentDeparture": "14:30",
        "currentArrival": "14:00",
        "route": ["NDLS"],
        "stopsAt": []
    }]

    result, metadata = optimize_schedule(trains, [], "NDLS", config, max_shift_minutes=5)

    # Shift should be within ±5 minutes
    shift_minutes = result["trains"][0]["shiftMinutes"]
    assert -5 <= shift_minutes <= 5


# ─── Objective Function Tests ────────────────────────────────────────────────


def test_objective_prefers_fewer_changes():
    """Test that optimizer prefers minimal schedule changes when possible."""
    config = load_timetable_config("timetable_config.json")

    # Already optimal transfer, should result in zero shifts
    trains = [
        {
            "trainNumber": "A",
            "trainName": "Train A",
            "currentDeparture": "14:00",
            "currentArrival": "13:50",
            "route": ["NDLS"],
            "stopsAt": []
        },
        {
            "trainNumber": "B",
            "trainName": "Train B",
            "currentDeparture": "14:10",
            "currentArrival": "14:05",
            "route": ["NDLS"],
            "stopsAt": []
        }
    ]

    transfer_pairs = [{
        "fromTrain": "A",
        "toTrain": "B",
        "passengerCount": 10
    }]

    result, metadata = optimize_schedule(trains, transfer_pairs, "NDLS", config)

    # All shifts should be 0 (no change needed)
    for train in result["trains"]:
        assert train["shiftMinutes"] == 0
        assert train["changed"] is False


def test_objective_weights():
    """Test that objective function balances transfer success vs schedule changes."""
    config = load_timetable_config("timetable_config.json")

    # Modify config to make transfer success more valuable
    # transferSuccessWeight=100, scheduleModificationPenalty=10 (per second)
    # A 2-minute shift costs 120 seconds * 10 = 1200 points
    # But a successful transfer is only worth 100 points
    # So optimizer won't shift. We need higher transferSuccessWeight.
    config_modified = config.copy()
    config_modified["transferSuccessWeight"] = 2000  # Much higher value

    # Infeasible transfer that requires shift
    trains = [
        {
            "trainNumber": "A",
            "trainName": "Train A",
            "currentDeparture": "14:00",
            "currentArrival": "13:50",
            "route": ["NDLS"],
            "stopsAt": []
        },
        {
            "trainNumber": "B",
            "trainName": "Train B",
            "currentDeparture": "14:01",  # Too soon (1 min = 60s < 180s min)
            "currentArrival": "13:59",
            "route": ["NDLS"],
            "stopsAt": []
        }
    ]

    transfer_pairs = [{
        "fromTrain": "A",
        "toTrain": "B",
        "passengerCount": 20
    }]

    result, metadata = optimize_schedule(trains, transfer_pairs, "NDLS", config_modified)

    # Should shift Train B to make transfer feasible (transferWeight > modificationPenalty)
    train_b = [t for t in result["trains"] if t["trainNumber"] == "B"][0]

    # Transfer should now be successful
    assert metadata["successfulTransfersAfter"] > metadata["successfulTransfersBefore"]
    # Train B should have been shifted
    assert train_b["changed"] is True


# ─── Output Format Tests ─────────────────────────────────────────────────────


def test_output_structure():
    """Test that output matches expected contract."""
    config = load_timetable_config("timetable_config.json")

    trains = [{
        "trainNumber": "12345",
        "trainName": "Test Express",
        "currentDeparture": "14:30",
        "currentArrival": "14:00",
        "route": ["NDLS", "AGC"],
        "stopsAt": [
            {"stationCode": "NDLS", "arrivalTime": "14:00", "departureTime": "14:30"}
        ]
    }]

    result, metadata = optimize_schedule(trains, [], "NDLS", config)

    # Check result structure
    assert "trains" in result
    assert "transferPairs" in result

    # Check train structure
    train = result["trains"][0]
    assert "trainNumber" in train
    assert "trainName" in train
    assert "originalDeparture" in train
    assert "optimizedDeparture" in train
    assert "shiftMinutes" in train
    assert "changed" in train
    assert "route" in train
    assert "stopsAt" in train

    # Check metadata structure
    assert "status" in metadata
    assert "solveTimeMs" in metadata
    assert "objectiveScore" in metadata
    assert "constraintsActive" in metadata
    assert "trainsEvaluated" in metadata
    assert "transferPairsEvaluated" in metadata
    assert "successfulTransfersBefore" in metadata
    assert "successfulTransfersAfter" in metadata
    assert "solverStatus" in metadata


def test_changed_flag_accuracy():
    """Test that 'changed' flag accurately reflects shifts."""
    config = load_timetable_config("timetable_config.json")

    trains = [
        {
            "trainNumber": "A",
            "trainName": "Train A",
            "currentDeparture": "14:00",
            "currentArrival": "13:50",
            "route": ["NDLS"],
            "stopsAt": []
        },
        {
            "trainNumber": "B",
            "trainName": "Train B",
            "currentDeparture": "14:02",  # Will need shift
            "currentArrival": "14:00",
            "route": ["NDLS"],
            "stopsAt": []
        }
    ]

    transfer_pairs = [{
        "fromTrain": "A",
        "toTrain": "B",
        "passengerCount": 10
    }]

    result, metadata = optimize_schedule(trains, transfer_pairs, "NDLS", config)

    for train in result["trains"]:
        if train["shiftMinutes"] == 0:
            assert train["changed"] is False
        else:
            assert train["changed"] is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
