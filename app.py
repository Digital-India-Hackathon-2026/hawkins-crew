"""
Web server for railway routes with persistent in-memory graph.

Graph loads once on startup, stays in memory for fast queries.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import pickle
import os
import json

from advanced_route_finder import AdvancedRouteFinder


app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False
app.json.compact = False
CORS(app)

# Global route finder - loaded once on startup
finder = None
GRAPH_LOADING = False
ERROR_MSG = None

# In-memory data stores (loaded once on startup)
STATIONS_LIST = []   # [{code, name, state, zone, lat, lng}]
TRAINS_MAP = {}      # {number -> train_info}
SCHEDULES_MAP = {}   # {train_number -> [stops]}


def load_static_data():
    """Load stations, trains, and schedules into memory."""
    global STATIONS_LIST, TRAINS_MAP, SCHEDULES_MAP

    # Load stations
    print("Loading stations.json...")
    with open("stations.json", "r") as f:
        stations_geojson = json.load(f)

    STATIONS_LIST = []
    for feat in stations_geojson["features"]:
        props = feat["properties"]
        code = props.get("code", "")
        name = props.get("name", "")
        # Skip placeholder entries (XX-, YY-, etc.)
        if not code or code.startswith("XX-") or code.startswith("YY-") or name == code:
            continue
        geom = feat.get("geometry")
        coords = geom["coordinates"] if geom and geom.get("coordinates") else [None, None]
        STATIONS_LIST.append({
            "code": code,
            "name": name,
            "state": props.get("state"),
            "zone": props.get("zone"),
            "address": props.get("address"),
            "longitude": coords[0],
            "latitude": coords[1],
        })

    # Sort alphabetically by name for consistent results
    STATIONS_LIST.sort(key=lambda s: s["name"])
    print(f"Loaded {len(STATIONS_LIST)} stations")

    # Load trains
    print("Loading trains.json...")
    with open("trains.json", "r") as f:
        trains_geojson = json.load(f)

    for feat in trains_geojson["features"]:
        props = feat["properties"]
        number = props.get("number", "")
        if not number:
            continue
        TRAINS_MAP[number] = {
            "number": number,
            "name": props.get("name", ""),
            "type": props.get("type", ""),
            "zone": props.get("zone", ""),
            "distance": props.get("distance", 0),
            "duration_h": props.get("duration_h", 0),
            "duration_m": props.get("duration_m", 0),
            "from_station_code": props.get("from_station_code", ""),
            "from_station_name": props.get("from_station_name", ""),
            "to_station_code": props.get("to_station_code", ""),
            "to_station_name": props.get("to_station_name", ""),
            "departure": props.get("departure", ""),
            "arrival": props.get("arrival", ""),
            "classes": props.get("classes", ""),
            "first_ac": props.get("first_ac", 0),
            "second_ac": props.get("second_ac", 0),
            "third_ac": props.get("third_ac", 0),
            "sleeper": props.get("sleeper", 0),
            "chair_car": props.get("chair_car", 0),
            "first_class": props.get("first_class", 0),
            "return_train": props.get("return_train", ""),
        }
    print(f"Loaded {len(TRAINS_MAP)} trains")

    # Load schedules
    print("Loading schedules.json...")
    with open("schedules.json", "r") as f:
        schedules = json.load(f)

    for entry in schedules:
        tn = entry.get("train_number", "")
        if not tn:
            continue
        if tn not in SCHEDULES_MAP:
            SCHEDULES_MAP[tn] = []
        SCHEDULES_MAP[tn].append({
            "station_code": entry.get("station_code", ""),
            "station_name": entry.get("station_name", ""),
            "arrival": entry.get("arrival", "None"),
            "departure": entry.get("departure", "None"),
            "day": entry.get("day", 1),
        })

    # Sort each train's schedule by day + arrival/departure
    def sort_key(stop):
        day = stop.get("day", 1) or 1
        arr = stop.get("arrival") or "None"
        dep = stop.get("departure") or "None"
        t = dep if dep != "None" else arr
        if t == "None":
            return day * 86400
        h, m, s = map(int, t.split(":"))
        return day * 86400 + h * 3600 + m * 60 + s

    for tn in SCHEDULES_MAP:
        SCHEDULES_MAP[tn].sort(key=sort_key)

    print(f"Loaded schedules for {len(SCHEDULES_MAP)} trains")


def load_graph():
    """Load graph and initialize route finder in background."""
    global finder, GRAPH_LOADING, ERROR_MSG

    try:
        print("Loading graph...")
        finder = AdvancedRouteFinder("graph.pkl")
        print(f"Route finder initialized")
        GRAPH_LOADING = False
    except Exception as e:
        GRAPH_LOADING = False
        ERROR_MSG = str(e)
        print(f"Error loading graph: {e}")


@app.before_request
def startup():
    """Load graph on first request."""
    global finder, GRAPH_LOADING

    if finder is None and not GRAPH_LOADING:
        GRAPH_LOADING = True
        load_graph()


# ─── Health & Info ────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    """Health check."""
    if finder is not None:
        return jsonify({
            "status": "ready",
            "nodes": finder.G.number_of_nodes(),
            "edges": finder.G.number_of_edges(),
            "stations_loaded": len(STATIONS_LIST),
            "trains_loaded": len(TRAINS_MAP),
        })
    elif GRAPH_LOADING:
        return jsonify({"status": "loading"}), 202
    else:
        return jsonify({"status": "error", "message": ERROR_MSG}), 500


@app.route("/info", methods=["GET"])
def info():
    """Get graph info."""
    if finder is None:
        return jsonify({"message": "Graph loading..."})

    return jsonify({
        "nodes": finder.G.number_of_nodes(),
        "edges": finder.G.number_of_edges(),
        "metadata": dict(finder.G.graph)
    })


# ─── Route Planning ───────────────────────────────────────────────────────────

@app.route("/route", methods=["POST"])
def get_route():
    """Find route between stations."""

    if finder is None:
        return jsonify({"error": "Graph not ready"}), 503

    try:
        data = request.json
        from_station = data.get("from", "").upper()
        to_station = data.get("to", "").upper()
        date_str = data.get("date")  # "2026-07-13"

        if not from_station or not to_station or not date_str:
            return jsonify({"error": "Missing from, to, or date"}), 400

        # Parse date
        travel_date = datetime.strptime(date_str, "%Y-%m-%d")

        # Find routes
        routes = finder.find_routes(from_station, to_station, travel_date, max_routes=5)

        if routes:
            return jsonify({
                "status": "found",
                "from": from_station,
                "to": to_station,
                "date": date_str,
                "routes": [
                    {
                        "rank": i + 1,
                        "segments": route.segments,
                        "total_duration": route.total_duration,
                        "total_waiting": route.total_waiting,
                        "num_transfers": route.num_transfers,
                        "trains_used": route.trains_used,
                        "score": route.score,
                        "score_breakdown": route.score_breakdown
                    }
                    for i, route in enumerate(routes)
                ]
            })
        else:
            return jsonify({
                "status": "not_found",
                "from": from_station,
                "to": to_station,
                "date": date_str,
                "message": f"No route from {from_station} to {to_station} on {date_str}"
            }), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ─── Stations ─────────────────────────────────────────────────────────────────

@app.route("/stations", methods=["GET"])
def get_stations():
    """Return all stations for autocomplete."""
    q = request.args.get("q", "").strip().upper()
    limit = min(int(request.args.get("limit", 50)), 200)

    if not q:
        # Return first 200 by default when no query
        return jsonify({
            "stations": STATIONS_LIST[:limit],
            "total": len(STATIONS_LIST)
        })

    # Filter by code or name
    results = []
    for s in STATIONS_LIST:
        if (q in s["code"].upper() or
                q in s["name"].upper()):
            results.append(s)
            if len(results) >= limit:
                break

    return jsonify({
        "stations": results,
        "total": len(results),
        "query": q
    })


@app.route("/stations/all", methods=["GET"])
def get_all_stations():
    """Return ALL stations (for frontend caching + Fuse.js)."""
    return jsonify({
        "stations": STATIONS_LIST,
        "total": len(STATIONS_LIST)
    })


@app.route("/stations/<code>/board", methods=["GET"])
def station_board(code):
    """Get station board: all trains stopping at this station."""
    code = code.upper()

    # Find station info
    station_info = next((s for s in STATIONS_LIST if s["code"] == code), None)
    if not station_info:
        return jsonify({"error": f"Station {code} not found"}), 404

    arrivals = []
    departures = []

    for train_number, stops in SCHEDULES_MAP.items():
        for stop in stops:
            if stop["station_code"] == code:
                train_info = TRAINS_MAP.get(train_number, {})
                entry = {
                    "train_number": train_number,
                    "train_name": train_info.get("name", stops[0].get("station_name", "")),
                    "arrival": stop["arrival"],
                    "departure": stop["departure"],
                    "day": stop["day"],
                    "from_station": train_info.get("from_station_name", ""),
                    "to_station": train_info.get("to_station_name", ""),
                    "type": train_info.get("type", ""),
                }
                if stop["arrival"] and stop["arrival"] != "None":
                    arrivals.append(entry)
                if stop["departure"] and stop["departure"] != "None":
                    departures.append(entry)
                break  # Each train appears once per station

    # Sort by departure/arrival time
    arrivals.sort(key=lambda x: x["arrival"] or "99:99:99")
    departures.sort(key=lambda x: x["departure"] or "99:99:99")

    return jsonify({
        "station": station_info,
        "arrivals": arrivals[:100],
        "departures": departures[:100],
        "total_arrivals": len(arrivals),
        "total_departures": len(departures),
    })


# ─── Trains ───────────────────────────────────────────────────────────────────

@app.route("/trains/search", methods=["GET"])
def search_trains():
    """Search trains by number or name."""
    q = request.args.get("q", "").strip()
    from_code = request.args.get("from", "").upper()
    to_code = request.args.get("to", "").upper()
    limit = min(int(request.args.get("limit", 20)), 100)

    results = []

    if from_code and to_code:
        # Search for trains running between two stations
        from_trains = set()
        to_trains = set()

        for train_number, stops in SCHEDULES_MAP.items():
            station_codes = [s["station_code"] for s in stops]
            if from_code in station_codes:
                from_trains.add(train_number)
            if to_code in station_codes:
                to_trains.add(train_number)

        # Trains that stop at both stations
        common_trains = from_trains & to_trains

        for tn in common_trains:
            stops = SCHEDULES_MAP[tn]
            station_codes = [s["station_code"] for s in stops]
            fi = station_codes.index(from_code) if from_code in station_codes else -1
            ti = station_codes.index(to_code) if to_code in station_codes else -1

            if fi == -1 or ti == -1 or fi >= ti:
                continue  # Wrong direction

            from_stop = stops[fi]
            to_stop = stops[ti]
            train_info = TRAINS_MAP.get(tn, {})

            results.append({
                "train_number": tn,
                "train_name": train_info.get("name", ""),
                "type": train_info.get("type", ""),
                "departure": from_stop["departure"],
                "arrival": to_stop["arrival"],
                "from_station": from_code,
                "to_station": to_code,
                "duration_h": train_info.get("duration_h", 0),
                "duration_m": train_info.get("duration_m", 0),
                "distance": train_info.get("distance", 0),
                "classes": train_info.get("classes", ""),
            })

        results = results[:limit]
    else:
        # Full-text search on number/name
        q_upper = q.upper()
        for number, info in TRAINS_MAP.items():
            if (q_upper in number or
                    q_upper in info.get("name", "").upper()):
                results.append(info)
                if len(results) >= limit:
                    break

    return jsonify({
        "trains": results,
        "total": len(results),
        "query": q,
    })


@app.route("/trains/<number>", methods=["GET"])
def get_train(number):
    """Get full train info and schedule."""
    number = number.upper()

    # Try to find with different formats
    train_info = TRAINS_MAP.get(number)
    if not train_info:
        # Try zero-padded
        train_info = TRAINS_MAP.get(number.zfill(5))

    if not train_info:
        return jsonify({"error": f"Train {number} not found"}), 404

    actual_number = train_info["number"]
    schedule = SCHEDULES_MAP.get(actual_number, [])

    # Enrich schedule stops with station names from STATIONS_LIST
    station_lookup = {s["code"]: s for s in STATIONS_LIST}
    enriched_schedule = []
    for stop in schedule:
        station = station_lookup.get(stop["station_code"], {})
        enriched_schedule.append({
            **stop,
            "station_name_full": station.get("name", stop.get("station_name", "")),
            "state": station.get("state"),
            "zone": station.get("zone"),
        })

    return jsonify({
        "train": train_info,
        "schedule": enriched_schedule,
        "total_stops": len(enriched_schedule),
    })


@app.route("/trains/<number>/schedule", methods=["GET"])
def get_train_schedule(number):
    """Get just the schedule for a train."""
    number = number.upper()
    schedule = SCHEDULES_MAP.get(number, SCHEDULES_MAP.get(number.zfill(5), []))

    if not schedule:
        return jsonify({"error": f"No schedule found for train {number}"}), 404

    return jsonify({
        "train_number": number,
        "schedule": schedule,
        "total_stops": len(schedule),
    })


@app.route("/fare", methods=["GET"])
def fare_lookup():
    """Calculate estimated fare between stations for a train."""
    train_number = request.args.get("train", "").upper()
    from_code = request.args.get("from", "").upper()
    to_code = request.args.get("to", "").upper()
    travel_class = request.args.get("class", "SL")

    if not train_number or not from_code or not to_code:
        return jsonify({"error": "Missing train, from, or to parameters"}), 400

    train_info = TRAINS_MAP.get(train_number)
    if not train_info:
        return jsonify({"error": f"Train {train_number} not found"}), 404

    schedule = SCHEDULES_MAP.get(train_number, [])
    station_codes = [s["station_code"] for s in schedule]

    fi = station_codes.index(from_code) if from_code in station_codes else -1
    ti = station_codes.index(to_code) if to_code in station_codes else -1

    if fi == -1 or ti == -1 or fi >= ti:
        return jsonify({"error": "Stations not found in train route or wrong direction"}), 404

    total_distance = train_info.get("distance", 0)
    total_stops = len(schedule)
    num_stops = ti - fi
    segment_fraction = num_stops / max(total_stops - 1, 1)
    segment_distance = round(total_distance * segment_fraction)

    # Base fares per km (approximate Indian Railways rates)
    base_rates = {
        "SL": 0.52,
        "3A": 1.28,
        "2A": 1.86,
        "1A": 3.12,
        "CC": 0.78,
        "2S": 0.35,
    }

    rate = base_rates.get(travel_class, 0.52)
    base_fare = round(segment_distance * rate)
    reservation_charge = 60 if travel_class in ["SL", "3A", "2A", "1A"] else 30
    total_fare = max(base_fare + reservation_charge, 50)

    # Build class-wise fares
    class_fares = {}
    available_classes = []
    if train_info.get("sleeper"):
        class_fares["SL"] = max(round(segment_distance * base_rates["SL"]) + 60, 50)
        available_classes.append("SL")
    if train_info.get("third_ac"):
        class_fares["3A"] = max(round(segment_distance * base_rates["3A"]) + 60, 150)
        available_classes.append("3A")
    if train_info.get("second_ac"):
        class_fares["2A"] = max(round(segment_distance * base_rates["2A"]) + 60, 200)
        available_classes.append("2A")
    if train_info.get("first_ac"):
        class_fares["1A"] = max(round(segment_distance * base_rates["1A"]) + 60, 400)
        available_classes.append("1A")
    if train_info.get("chair_car"):
        class_fares["CC"] = max(round(segment_distance * base_rates["CC"]) + 30, 50)
        available_classes.append("CC")
    if train_info.get("first_class"):
        class_fares["2S"] = max(round(segment_distance * base_rates["2S"]) + 30, 30)
        available_classes.append("2S")

    return jsonify({
        "train_number": train_number,
        "train_name": train_info.get("name", ""),
        "from_station": from_code,
        "to_station": to_code,
        "segment_distance_km": segment_distance,
        "selected_class": travel_class,
        "fare": total_fare,
        "class_fares": class_fares,
        "available_classes": available_classes,
        "note": "Fares are approximate estimates based on distance. Actual fares may vary."
    })


if __name__ == "__main__":
    # Load static data first
    print("Prayan Railway Route Server")
    print("=" * 60)
    print("Starting data load...")

    load_static_data()
    load_graph()

    if finder is None:
        print("Error: Failed to load graph")
        exit(1)

    print("\nServer starting on http://localhost:5000")
    print("Endpoints:")
    print("  POST /route                   - Find multi-train route")
    print("  GET  /health                  - Health check")
    print("  GET  /info                    - Graph info")
    print("  GET  /stations                - Search stations")
    print("  GET  /stations/all            - All stations (for frontend cache)")
    print("  GET  /stations/<code>/board   - Station board")
    print("  GET  /trains/search           - Search trains")
    print("  GET  /trains/<number>         - Train info + schedule")
    print("  GET  /fare                    - Fare lookup")
    print("=" * 60)

    app.run(debug=False, port=5000, threaded=True)
