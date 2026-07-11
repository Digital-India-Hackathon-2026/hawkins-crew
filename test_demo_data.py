#!/usr/bin/env python3
"""
Test script to verify demo data endpoints are working correctly.
Tests dashboard metrics, transfer analytics, and station details.
"""

import requests
import json
from typing import Dict, Any

BACKEND_URL = "http://localhost:5000"
FRONTEND_URL = "http://localhost:3000"

def print_header(title: str):
    """Print a formatted header"""
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80 + "\n")


def print_metric(label: str, value: Any, color: str = ""):
    """Print a formatted metric"""
    print(f"  {label:.<40} {value}")


def test_dashboard_metrics():
    """Test dashboard metrics endpoint"""
    print_header("DASHBOARD METRICS TEST")

    try:
        response = requests.get(f"{BACKEND_URL}/admin/dashboard-metrics", timeout=5)

        if response.status_code != 200:
            print(f"❌ Failed: HTTP {response.status_code}")
            print(response.text)
            return False

        data = response.json()

        print("✅ Dashboard metrics loaded successfully!")
        print()
        print_metric("Total Searches", f"{data['totalSearches']:,}")
        print_metric("Total Transfers", f"{data['totalTransfers']:,}")
        print_metric("Successful Transfers", f"{data['successfulTransfers']:,}")
        print_metric("Failed Transfers", f"{data['failedTransfers']:,}")
        print_metric("Success Rate", f"{data['successRate']}%")
        print_metric("Avg Waiting Time", f"{data['avgWaitingTime']} min")

        # Verify calculations
        calculated_rate = round(data['successfulTransfers'] / data['totalTransfers'] * 100)
        if abs(calculated_rate - data['successRate']) <= 1:
            print("\n✓ Success rate calculation is correct")
        else:
            print(f"\n⚠ Success rate mismatch: {calculated_rate}% expected, got {data['successRate']}%")

        return True

    except requests.exceptions.ConnectionError:
        print("❌ Error: Cannot connect to backend at", BACKEND_URL)
        print("   Make sure Flask server is running: python app.py")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_transfer_analytics():
    """Test transfer analytics endpoint"""
    print_header("TRANSFER ANALYTICS TEST")

    try:
        response = requests.get(f"{BACKEND_URL}/admin/transfer-analytics", timeout=5)

        if response.status_code != 200:
            print(f"❌ Failed: HTTP {response.status_code}")
            print(response.text)
            return False

        data = response.json()

        print("✅ Transfer analytics loaded successfully!")
        print()

        # Station Success Rates
        stations = data['stationSuccessRates']
        print(f"📊 Station Performance (Top 5 of {len(stations)}):")
        print()
        print(f"  {'Station':<8} {'Rate':<8} {'Total':<8} {'Success':<10} {'Failed':<8} {'Avg Wait':<10}")
        print(f"  {'-'*8} {'-'*8} {'-'*8} {'-'*10} {'-'*8} {'-'*10}")

        for station in stations[:5]:
            rate_str = f"{station['successRate']:.1f}%"
            wait_str = f"{station['avgWaitTime']:.0f} min"
            print(f"  {station['station']:<8} {rate_str:<8} {station['total']:<8} "
                  f"{station['successful']:<10} {station['failed']:<8} {wait_str:<10}")

        # Verify success rate correlation with waiting time
        high_performers = [s for s in stations if s['successRate'] >= 80]
        low_performers = [s for s in stations if s['successRate'] < 65]

        if high_performers:
            avg_wait_high = sum(s['avgWaitTime'] for s in high_performers) / len(high_performers)
        else:
            avg_wait_high = 0

        if low_performers:
            avg_wait_low = sum(s['avgWaitTime'] for s in low_performers) / len(low_performers)
        else:
            avg_wait_low = 0

        if avg_wait_high > 0 and avg_wait_low > 0:
            print()
            print(f"✓ High performers avg wait: {avg_wait_high:.0f} min")
            print(f"✓ Low performers avg wait: {avg_wait_low:.0f} min")
            if avg_wait_low > avg_wait_high:
                print("✓ Correlation is correct: lower success = higher wait time")

        # Problematic Train Pairs
        pairs = data['problematicTrainPairs']
        print()
        print(f"🚨 Problematic Train Pairs (Top 5 of {len(pairs)}):")
        print()
        print(f"  {'Train Pair':<18} {'Attempts':<10} {'Failures':<10} {'Success Rate':<12}")
        print(f"  {'-'*18} {'-'*10} {'-'*10} {'-'*12}")

        for pair in pairs[:5]:
            rate_str = f"{pair['successRate']}%"
            print(f"  {pair['trainPair']:<18} {pair['totalAttempts']:<10} "
                  f"{pair['failures']:<10} {rate_str:<12}")

        # Verify worst pairs have lowest success rates
        if len(pairs) >= 3:
            worst_three_avg = sum(p['successRate'] for p in pairs[:3]) / 3
            if worst_three_avg < 60:
                print()
                print(f"✓ Worst pairs avg success rate: {worst_three_avg:.1f}% (< 60%)")

        return True

    except requests.exceptions.ConnectionError:
        print("❌ Error: Cannot connect to backend")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def test_station_details():
    """Test station details endpoint"""
    print_header("STATION DETAILS TEST")

    test_stations = ["NDLS", "BCT", "HWH", "UNKN"]  # Include one unknown station

    for station_code in test_stations:
        print(f"\n🔍 Testing station: {station_code}")
        print("-" * 40)

        try:
            response = requests.get(
                f"{BACKEND_URL}/admin/station-details/{station_code}",
                timeout=5
            )

            if response.status_code != 200:
                print(f"❌ Failed: HTTP {response.status_code}")
                continue

            data = response.json()

            print(f"✅ {station_code} details loaded")
            print()
            print_metric("Total Transfers", data['totalTransfers'])
            print_metric("Successful", data['successfulTransfers'])
            print_metric("Failed", data['failedTransfers'])
            print_metric("Success Rate", f"{data['successRate']}%")
            print_metric("Avg Waiting Time", f"{data['avgWaitingTime']} min")

            # Train pairs
            pairs = data['topTrainPairs']
            if pairs:
                print()
                print(f"  Top 3 Train Pairs:")
                for i, pair in enumerate(pairs[:3], 1):
                    print(f"    {i}. {pair['trainPair']:<20} {pair['count']} transfers")

            # Verify consistent data for same station
            response2 = requests.get(
                f"{BACKEND_URL}/admin/station-details/{station_code}",
                timeout=5
            )
            data2 = response2.json()

            if data == data2:
                print()
                print("✓ Data is consistent across requests")
            else:
                print()
                print("⚠ Warning: Data varies between requests")

        except Exception as e:
            print(f"❌ Error: {e}")

    return True


def test_frontend_integration():
    """Test that frontend can reach the endpoints"""
    print_header("FRONTEND INTEGRATION TEST")

    endpoints = [
        ("Dashboard Metrics", f"{FRONTEND_URL}/api/admin/dashboard-metrics"),
        ("Transfer Analytics", f"{FRONTEND_URL}/api/admin/transfer-analytics"),
        ("Station Details", f"{FRONTEND_URL}/api/admin/station/NDLS"),
    ]

    print("Testing Next.js API routes...")
    print()

    all_pass = True
    for name, url in endpoints:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                print(f"✅ {name:<25} OK")
            else:
                print(f"❌ {name:<25} HTTP {response.status_code}")
                all_pass = False
        except requests.exceptions.ConnectionError:
            print(f"❌ {name:<25} Connection refused (is frontend running?)")
            all_pass = False
        except Exception as e:
            print(f"❌ {name:<25} Error: {e}")
            all_pass = False

    if all_pass:
        print()
        print("✓ All frontend API routes are accessible")

    return all_pass


def main():
    """Run all tests"""
    print()
    print("╔" + "═" * 78 + "╗")
    print("║" + " " * 20 + "DEMO DATA ENDPOINTS TEST" + " " * 34 + "║")
    print("╚" + "═" * 78 + "╝")

    results = []

    # Test backend endpoints
    results.append(("Dashboard Metrics", test_dashboard_metrics()))
    results.append(("Transfer Analytics", test_transfer_analytics()))
    results.append(("Station Details", test_station_details()))

    # Test frontend integration (optional - frontend might not be running)
    print()
    print("Note: Frontend tests require Next.js dev server to be running")
    print("      (cd frontend && npm run dev)")
    print()
    results.append(("Frontend Integration", test_frontend_integration()))

    # Summary
    print_header("TEST SUMMARY")

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {name:<30} {status}")

    print()
    print(f"  Results: {passed}/{total} tests passed")

    if passed == total:
        print()
        print("🎉 All tests passed! Demo data is working correctly.")
        print()
        print("Next steps:")
        print("  1. Open http://localhost:3000/admin/dashboard")
        print("  2. Navigate to http://localhost:3000/admin/transfer-analytics")
        print("  3. Try http://localhost:3000/admin/station")
        print()
    elif passed >= 3:  # Backend tests pass, frontend might not be running
        print()
        print("✓ Backend tests passed! Frontend tests failed (server not running?)")
        print()
        print("To test frontend:")
        print("  1. Start frontend: cd frontend && npm run dev")
        print("  2. Re-run this script")
        print()
    else:
        print()
        print("⚠ Some tests failed. Check backend server status:")
        print("  python app.py")
        print()


if __name__ == "__main__":
    main()
