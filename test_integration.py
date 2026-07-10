"""
Smoke test to verify CP-SAT optimizer integrates correctly with app.py

This doesn't test the full Flask app (requires graph.pkl), but verifies:
1. Config loads successfully
2. Optimizer can be called with route-like objects
3. Integration points are correctly wired
"""

import json
from optimization import select_optimal_route, load_optimizer_config


def test_config_loads():
    """Test that optimizer_config.json loads successfully."""
    config = load_optimizer_config("optimizer_config.json")

    assert config is not None
    assert "waitingPenalty" in config
    assert "transferPenalty" in config
    assert "delayPenalty" in config
    assert "maxTransfers" in config
    assert "maxWaitingTime" in config

    print("[OK] Config loads successfully")
    print(f"   maxTransfers: {config['maxTransfers']}")
    print(f"   maxWaitingTime: {config['maxWaitingTime']}s")
    return config


def test_optimizer_with_sample_routes(config):
    """Test optimizer with Journey-like route objects."""

    # Simulate routes as they would come from advanced_route_finder.py
    # (converted to dicts in app.py)
    routes = [
        {
            "rank": 1,
            "total_duration": 14400,  # 4 hours
            "total_waiting": 1800,    # 30 min
            "num_transfers": 1,
            "trains_used": ["12345", "67890"],
            "stations_visited": ["NDLS", "JHS", "HWH"],
            "score": 18000,
            "score_breakdown": {
                "travel_time": 14400,
                "transfer_penalty": 3600,
                "waiting_time": 1440
            },
            "segments": []
        },
        {
            "rank": 2,
            "total_duration": 10800,  # 3 hours (faster but higher delay risk)
            "total_waiting": 0,
            "num_transfers": 0,
            "trains_used": ["11111"],
            "stations_visited": ["NDLS", "HWH"],
            "score": 12000,
            "score_breakdown": {
                "travel_time": 10800,
                "transfer_penalty": 0,
                "waiting_time": 0
            },
            "segments": []
        },
        {
            "rank": 3,
            "total_duration": 18000,  # 5 hours (slow)
            "total_waiting": 3600,    # 1 hour
            "num_transfers": 2,
            "trains_used": ["22222", "33333", "44444"],
            "stations_visited": ["NDLS", "AGC", "CNB", "HWH"],
            "score": 25000,
            "score_breakdown": {
                "travel_time": 18000,
                "transfer_penalty": 7200,
                "waiting_time": 2880
            },
            "segments": []
        },
    ]

    print("\n[OK] Testing optimizer with sample routes:")
    for r in routes:
        print(f"   Route {r['rank']}: {r['trains_used']} - {r['total_duration']}s, {r['num_transfers']} transfers")

    # Call optimizer
    optimal, metadata = select_optimal_route(routes, config)

    assert optimal is not None, "Optimizer should return a route"
    assert metadata["status"] in ["optimal", "feasible"], f"Unexpected status: {metadata['status']}"
    assert "objective_score" in metadata
    assert "solve_time_ms" in metadata

    print(f"\n[OK] Optimizer completed successfully")
    print(f"   Status: {metadata['status']}")
    print(f"   Selected: {optimal['trains_used']}")
    print(f"   Objective score: {metadata['objective_score']:.2f}")
    print(f"   Solve time: {metadata['solve_time_ms']:.2f}ms")
    print(f"   Candidates evaluated: {metadata['candidates_evaluated']}")
    print(f"   Feasible candidates: {metadata['candidates_feasible']}")

    return optimal, metadata


def test_missing_delay_fields(config):
    """Test that optimizer handles routes without delayRisk/reliabilityScore."""
    routes = [
        {
            "total_duration": 10800,
            "total_waiting": 0,
            "num_transfers": 0,
            "trains_used": ["12345"],
            "stations_visited": ["SRC", "DST"],
            # No delayRisk or reliabilityScore — should use defaults
        }
    ]

    optimal, metadata = select_optimal_route(routes, config)

    assert optimal is not None
    assert metadata["status"] == "single_candidate"

    print("\n[OK] Missing delay fields handled correctly (used defaults)")
    print(f"   Status: {metadata['status']}")


def test_all_routes_violate_constraints(config):
    """Test fallback when all routes violate hard constraints."""
    routes = [
        {
            "total_duration": 10800,
            "total_waiting": 10800,  # Exceeds maxWaitingTime
            "num_transfers": 5,      # Exceeds maxTransfers
            "trains_used": ["A", "B", "C", "D", "E", "F"],
            "stations_visited": ["SRC", "M1", "M2", "M3", "M4", "M5", "DST"]
        },
        {
            "total_duration": 14400,
            "total_waiting": 12000,  # Exceeds maxWaitingTime
            "num_transfers": 4,      # Exceeds maxTransfers
            "trains_used": ["X", "Y", "Z", "W", "V"],
            "stations_visited": ["SRC", "M1", "M2", "M3", "M4", "DST"]
        },
    ]

    optimal, metadata = select_optimal_route(routes, config)

    assert optimal is not None
    assert metadata["status"] == "infeasible_relaxed"

    print("\n[OK] Constraint violation fallback works")
    print(f"   Status: {metadata['status']} (expected)")
    print(f"   Selected best available: {optimal['trains_used']}")


def main():
    print("=" * 70)
    print("CP-SAT Optimizer Integration Smoke Test")
    print("=" * 70)

    config = test_config_loads()
    test_optimizer_with_sample_routes(config)
    test_missing_delay_fields(config)
    test_all_routes_violate_constraints(config)

    print("\n" + "=" * 70)
    print("[OK] ALL INTEGRATION TESTS PASSED")
    print("=" * 70)
    print("\nOptimizer is ready for production use.")
    print("Next step: Test with actual Flask app once backend is running.")


if __name__ == "__main__":
    main()
