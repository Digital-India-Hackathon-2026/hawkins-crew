#!/usr/bin/env python3
"""
Demo script to test timetable optimization with realistic data
that produces visible before/after differences.

This generates a test scenario at Delhi Junction (NDLS) with trains
that have poor transfer windows initially, then shows how the optimizer
improves them.
"""

import requests
import json
from datetime import datetime, timedelta

BACKEND_URL = "http://localhost:5000"

def test_optimizer_demo():
    """
    Test the optimizer with a realistic scenario at NDLS junction.
    """
    print("=" * 80)
    print("TIMETABLE OPTIMIZER DEMO TEST")
    print("=" * 80)
    print()

    # Demo scenario: Delhi Junction (NDLS)
    # These trains have problematic transfer windows that need optimization
    demo_request = {
        "stationCode": "NDLS",  # New Delhi Junction
        "trainNumbers": [
            "12301",  # Howrah Rajdhani (arrives from east)
            "12302",  # Howrah Rajdhani (departs to east)
            "12951",  # Mumbai Rajdhani (arrives from west)
            "12429",  # Lucknow Mail (arrives from north)
        ],
        "maxShiftMinutes": 15
    }

    print(f"📍 Junction Station: {demo_request['stationCode']}")
    print(f"🚂 Trains: {', '.join(demo_request['trainNumbers'])}")
    print(f"⏱️  Max Shift Window: {demo_request['maxShiftMinutes']} minutes")
    print()
    print("Sending optimization request...")
    print()

    try:
        response = requests.post(
            f"{BACKEND_URL}/admin/optimize-timetable",
            json=demo_request,
            timeout=60
        )

        if response.status_code != 200:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return

        result = response.json()

        # Display results
        print("✅ Optimization Complete!")
        print()
        print("-" * 80)
        print("BEFORE vs AFTER COMPARISON")
        print("-" * 80)
        print()

        before = result["before"]
        after = result["after"]

        print(f"  Avg Waiting Time:         {before['avgWaitingTime']}s → {after['avgWaitingTime']}s")
        print(f"  Transfer Success Rate:    {before['successRate']}% → {after['successRate']}%")
        print(f"  Total Transfers:          {before['totalTransfers']}")
        print(f"  Problematic Connections:  {before['problematicConnections']} → {after['problematicConnections']}")
        print()

        # Show optimizer metadata
        meta = result["optimizerMetadata"]
        print("-" * 80)
        print("OPTIMIZER DETAILS")
        print("-" * 80)
        print()
        print(f"  Status:                   {meta['status'].upper()}")
        print(f"  Solve Time:               {meta['solveTimeMs']:.1f}ms")
        print(f"  Trains Evaluated:         {meta['trainsEvaluated']}")
        print(f"  Transfer Pairs:           {meta['transferPairsEvaluated']}")
        print(f"  Successful Transfers:     {meta['successfulTransfersBefore']} → {meta['successfulTransfersAfter']}")
        print()

        # Show recommended changes
        changes = result["recommendedChanges"]
        if changes:
            print("-" * 80)
            print("RECOMMENDED TIMETABLE CHANGES")
            print("-" * 80)
            print()

            for change in changes:
                print(f"  🚂 Train {change['trainNumber']} - {change['trainName']}")
                print(f"     Current:      {change['currentDeparture']}")
                print(f"     Recommended:  {change['recommendedDeparture']} (+{change['shiftMinutes']} min)")
                print(f"     Reason:       {change['reason']}")
                print(f"     Impact:       {change['impactedConnections']} connections, +{change['improvementScore']}% score")
                print(f"     Route:        {' → '.join(change['route'][:5])}..." if len(change['route']) > 5 else f" → ".join(change['route']))
                print()
        else:
            print("✓ No changes needed - current schedule is already optimal!")
            print()

        print("-" * 80)
        print("VIEW IN UI")
        print("-" * 80)
        print()
        print("Open the admin optimizer page to see the before/after map visualization:")
        print()
        print("  http://localhost:3000/admin/optimizer")
        print()
        print("Use the demo values:")
        print(f"  - Station: {demo_request['stationCode']}")
        print(f"  - Trains: {', '.join(demo_request['trainNumbers'])}")
        print(f"  - Max Shift: {demo_request['maxShiftMinutes']} minutes")
        print()
        print("Toggle between 'Before' and 'After' modes to see:")
        print("  • Original routes (solid lines, lower opacity)")
        print("  • Optimized routes (dashed lines, bright amber, thicker)")
        print("  • Station timing changes in popups")
        print()

    except requests.exceptions.ConnectionError:
        print("❌ Error: Cannot connect to backend at", BACKEND_URL)
        print()
        print("Make sure the Flask server is running:")
        print("  python app.py")
        print()
    except requests.exceptions.Timeout:
        print("❌ Error: Request timed out after 60 seconds")
        print()
    except Exception as e:
        print(f"❌ Error: {e}")
        print()


if __name__ == "__main__":
    test_optimizer_demo()
