"""
Web server for railway routes with persistent in-memory graph.

Graph loads once on startup, stays in memory for fast queries.
"""

from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import pickle
import os
import json
import requests as http_requests

from advanced_route_finder import AdvancedRouteFinder
from mongodb import connect_to_mongodb, disconnect_from_mongodb
from optimization import select_optimal_route, load_optimizer_config, optimize_schedule, load_timetable_config
from n8n_service import enrich_routes_with_delay_risk


app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False
app.json.compact = False

# ─── CORS ─────────────────────────────────────────────────────────────────────
# In production set ALLOWED_ORIGINS to a comma-separated list of allowed origins.
# Example: ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
# Leave unset (or set to "*") during local development for convenience.
_raw_origins = os.environ.get("ALLOWED_ORIGINS", "*")
_allowed_origins = (
    [o.strip() for o in _raw_origins.split(",") if o.strip()]
    if _raw_origins != "*"
    else "*"
)
CORS(app, origins=_allowed_origins, supports_credentials=False)


# Global route finder - loaded once on startup
finder = None
GRAPH_LOADING = False
ERROR_MSG = None

# Optimizer configs - loaded once on startup
OPTIMIZER_CONFIG = None
TIMETABLE_CONFIG = None

# In-memory data stores (loaded once on startup)
STATIONS_LIST = []   # [{code, name, state, zone, lat, lng}]
TRAINS_MAP = {}      # {number -> train_info}
SCHEDULES_MAP = {}   # {train_number -> [stops]}


def format_score_breakdown(breakdown: dict) -> dict:
    """Convert score breakdown from seconds to user-friendly format."""
    formatted = {}
    for key, value in breakdown.items():
        if key == 'travel_time':
            hours = int(value // 3600)
            mins = int((value % 3600) // 60)
            formatted['Time on Trains'] = f"{hours}h {mins}m" if hours > 0 else f"{mins}m"
        elif key == 'waiting_time':
            hours = int(value // 3600)
            mins = int((value % 3600) // 60)
            formatted['Waiting at Stations'] = f"{hours}h {mins}m" if hours > 0 else f"{mins}m"
        elif key == 'transfer_penalty':
            transfers = int(value / 3600) if value > 0 else 0
            formatted['Transfer Changes'] = f"{transfers} changes"
        elif key == 'centrality_bonus':
            formatted['Route Directness'] = "Direct" if value == 0 else f"{value:.0f} penalty"
    return formatted


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
    global finder, GRAPH_LOADING, ERROR_MSG, OPTIMIZER_CONFIG, TIMETABLE_CONFIG

    try:
        print("Loading graph...")
        finder = AdvancedRouteFinder("graph.pkl")
        print(f"Route finder initialized")

        # Load optimizer configs
        print("Loading optimizer config...")
        OPTIMIZER_CONFIG = load_optimizer_config("optimizer_config.json")
        print(f"Route optimizer config loaded")

        print("Loading timetable optimizer config...")
        TIMETABLE_CONFIG = load_timetable_config("timetable_config.json")
        print(f"Timetable optimizer config loaded")

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
    """Find route between stations. Returns routes immediately without delay risk."""

    if finder is None:
        return jsonify({"error": "Graph not ready"}), 503

    try:
        data = request.json
        from_station = data.get("from", "").upper()
        to_station = data.get("to", "").upper()
        date_str = data.get("date")  # "2026-07-13"
        via_stations = data.get("viaStations", [])  # Optional list of via station codes

        if not from_station or not to_station or not date_str:
            return jsonify({"error": "Missing from, to, or date"}), 400

        # Parse date
        travel_date = datetime.strptime(date_str, "%Y-%m-%d")

        # Normalize via stations to uppercase
        via_stations = [v.upper() for v in via_stations if v]

        # Validate via stations
        if via_stations:
            all_stations = [from_station] + via_stations + [to_station]
            if len(all_stations) != len(set(all_stations)):
                return jsonify({"error": "Duplicate stations in route (source, via, or destination)"}), 400

            # Check if via station equals source or destination
            if from_station in via_stations:
                return jsonify({"error": "Via station cannot be the same as source"}), 400
            if to_station in via_stations:
                return jsonify({"error": "Via station cannot be the same as destination"}), 400

        # Find routes (with or without via stations)
        if via_stations:
            routes = finder.find_routes_with_via_stations(
                from_station, to_station, via_stations, travel_date, max_routes=5
            )
        else:
            routes = finder.find_routes(from_station, to_station, travel_date, max_routes=5)

        if routes:
            # Convert Journey objects to dicts for processing
            candidate_routes = [
                {
                    "rank": i + 1,
                    "segments": route.segments,
                    "total_duration": route.total_duration,
                    "total_waiting": route.total_waiting,
                    "num_transfers": route.num_transfers,
                    "trains_used": route.trains_used,
                    "stations_visited": route.stations_visited,
                    "score": route.score,
                    "score_breakdown": format_score_breakdown(route.score_breakdown)
                }
                for i, route in enumerate(routes)
            ]

            # ─── CP-SAT Optimizer Stage ───
            # POST-PROCESSING: Select optimal route from candidates using
            # configurable weighted objectives and hard constraints.
            # This does NOT re-rank — it makes a final selection decision.
            #
            # Future: After n8n delay analysis enrichment adds delayRisk and
            # reliabilityScore fields to each route, the optimizer will use
            # those values. Currently uses defaults from config.
            optimal_route, opt_metadata = select_optimal_route(
                candidate_routes,
                OPTIMIZER_CONFIG
            )

            # Return all candidate routes (for frontend display) plus the
            # optimizer's selected route and metadata (for logging/debugging)
            return jsonify({
                "status": "found",
                "from": from_station,
                "to": to_station,
                "date": date_str,
                "viaStations": via_stations if via_stations else None,
                "routes": candidate_routes,
                "optimal_route": optimal_route,
                "optimizer_metadata": opt_metadata
            })
        else:
            via_msg = f" via {' → '.join(via_stations)}" if via_stations else ""
            return jsonify({
                "status": "not_found",
                "from": from_station,
                "to": to_station,
                "date": date_str,
                "viaStations": via_stations if via_stations else None,
                "message": f"No route from {from_station}{via_msg} to {to_station} on {date_str}"
            }), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 400


@app.route("/delay-risk", methods=["POST"])
def get_delay_risk():
    """
    Fetch AI-powered delay risk for a single route via n8n.
    Called lazily by the frontend after routes are already displayed.

    Request body:
        {
            "from": "SRC",
            "to": "HWH",
            "date": "2026-07-15",
            "route": { ...single route object... }
        }

    Response:
        { "riskScore": 67, "description": "...", "recommendation": "...", "available": true }
    """
    try:
        body = request.json or {}
        route = body.get("route")
        if not route:
            return jsonify({"error": "Missing route in request body"}), 400

        route_response = {
            "from": body.get("from", ""),
            "to": body.get("to", ""),
            "date": body.get("date", ""),
            "status": "found",
            "routes": [route],
        }

        from n8n_service import enrich_routes_with_delay_risk
        enriched = enrich_routes_with_delay_risk(route_response)
        risk = enriched["routes"][0].get("delayRisk", {
            "riskScore": None,
            "description": "Delay analysis unavailable.",
            "recommendation": "Check live train status before departure.",
            "available": False,
        })
        return jsonify(risk)

    except Exception as e:
        print(f"[delay-risk] Error: {e}")
        return jsonify({
            "riskScore": None,
            "description": "Delay analysis unavailable.",
            "recommendation": "Check live train status before departure.",
            "available": False,
        })


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


# ─── PNR Status ──────────────────────────────────────────────────────────────

IRCTC_API_KEY = os.environ.get("IRCTC_API_KEY", "")
IRCTC_PNR_URL = "http://indianrailapi.com/api/v2/PNRCheck/apikey/{apikey}/PNRNumber/{pnr}/"
IRCTC_LIVE_URL = "http://indianrailapi.com/api/v2/livetrainstatus/apikey/{apikey}/trainnumber/{train}/date/{date}/"
IRCTC_AVAIL_URL = "https://indianrailapi.com/api/v2/SeatAvailability/apikey/{apikey}/TrainNumber/{train}/From/{fr}/To/{to}/Date/{date}/Quota/{quota}/Class/{cls}/"


@app.route("/pnr/<pnr>", methods=["GET"])
def pnr_status(pnr: str):
    """Check PNR status via external Indian Rail API."""
    if not IRCTC_API_KEY:
        return jsonify({
            "success": False,
            "error": "PNR API key not configured on the server."
        }), 503

    if not pnr or len(pnr) != 10 or not pnr.isdigit():
        return jsonify({
            "success": False,
            "error": "Invalid PNR number. Must be exactly 10 digits."
        }), 400

    try:
        url = IRCTC_PNR_URL.format(apikey=IRCTC_API_KEY, pnr=pnr)
        resp = http_requests.get(url, timeout=15)

        if resp.status_code != 200:
            return jsonify({
                "success": False,
                "error": f"External API returned status {resp.status_code}."
            }), 502

        data = resp.json()

        if data.get("Status") != "SUCCESS":
            return jsonify({
                "success": False,
                "error": data.get("Message", "Unable to fetch PNR status. Please verify the PNR number and try again.")
            })

        passengers_raw = data.get("Passangers", data.get("Passengers", []))
        passengers = []
        for p in passengers_raw:
            passengers.append({
                "number": p.get("Passenger", "").replace("Passenger ", ""),
                "booking_status": p.get("BookingStatus", ""),
                "current_status": p.get("CurrentStatus", ""),
            })

        return jsonify({
            "success": True,
            "data": {
                "pnr": data.get("PnrNumber", pnr),
                "train_number": data.get("TrainNumber", ""),
                "train_name": data.get("TrainName", ""),
                "journey_class": data.get("JourneyClass", ""),
                "chart_prepared": data.get("ChatPrepared", data.get("ChartPrepared", "")),
                "source": data.get("From", ""),
                "destination": data.get("To", ""),
                "journey_date": data.get("JourneyDate", ""),
                "boarding_date": data.get("Doj", data.get("JourneyDate", "")),
                "departure_time": data.get("DepartureTime", ""),
                "arrival_time": data.get("ArrivalTime", ""),
                "booking_status": data.get("BookingStatus", ""),
                "current_status": data.get("CurrentStatus", ""),
                "last_updated": data.get("LastUpdated", ""),
                "passengers": passengers,
            }
        })

    except http_requests.exceptions.Timeout:
        return jsonify({
            "success": False,
            "error": "PNR check timed out. Please try again."
        }), 504
    except http_requests.exceptions.ConnectionError:
        return jsonify({
            "success": False,
            "error": "Unable to connect to PNR service. Please try again later."
        }), 503
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"An unexpected error occurred: {str(e)}"
        }), 500


# ─── Live Train Tracking ──────────────────────────────────────────────────────

@app.route("/trains/<number>/live", methods=["GET"])
def live_train_status(number: str):
    """Track live train position via external Indian Rail API."""
    date = request.args.get("date", "")

    if not IRCTC_API_KEY:
        return jsonify({
            "success": False,
            "error": "Live tracking API key not configured on the server."
        }), 503

    if not date:
        # Default to today
        from datetime import date as dt_date
        date = dt_date.today().strftime("%Y%m%d")

    try:
        url = IRCTC_LIVE_URL.format(apikey=IRCTC_API_KEY, train=number, date=date)
        resp = http_requests.get(url, timeout=15)

        if resp.status_code != 200:
            return jsonify({
                "success": False,
                "error": f"External API returned status {resp.status_code}."
            }), 502

        data = resp.json()

        if data.get("Message") != "SUCCESS":
            return jsonify({
                "success": False,
                "error": data.get("Message", "Unable to fetch live status. Please verify the train number and try again.")
            })

        current = data.get("CurrentStation", {}) or {}
        route_raw = data.get("TrainRoute", []) or []

        route = []
        for stop in route_raw:
            sch_arr = stop.get("ScheduleArrival", "")
            act_arr = stop.get("ActualArrival", "")
            sch_dep = stop.get("ScheduleDeparture", "")
            act_dep = stop.get("ActualDeparture", "")

            delay_arr = stop.get("DelayInArrival", "0 M").replace(" M", "").replace(" Min", "")
            delay_dep = stop.get("DelayInDeparture", "0 M").replace(" M", "").replace(" Min", "")

            try:
                delay_arr_min = int(delay_arr)
            except ValueError:
                delay_arr_min = 0
            try:
                delay_dep_min = int(delay_dep)
            except ValueError:
                delay_dep_min = 0

            route.append({
                "serial": stop.get("SerialNo", ""),
                "station_name": stop.get("StationName", ""),
                "station_code": stop.get("StationCode", ""),
                "distance": stop.get("Distance", ""),
                "is_departed": stop.get("IsDeparted", ""),
                "day": stop.get("Day", 0),
                "scheduled_arrival": sch_arr,
                "actual_arrival": act_arr,
                "scheduled_departure": sch_dep,
                "actual_departure": act_dep,
                "delay_arrival_min": delay_arr_min,
                "delay_departure_min": delay_dep_min,
                "is_source": sch_arr == "Source",
                "is_destination": sch_dep == "Destination",
            })

        # Determine which stations are completed, current, upcoming
        current_idx = -1
        if current.get("StationCode"):
            for i, s in enumerate(route):
                if s["station_code"] == current.get("StationCode"):
                    current_idx = i
                    break

        # Calculate overall delay from current station
        overall_delay = 0
        if current:
            d = current.get("DelayInArrival", "0 M").replace(" M", "").replace(" Min", "")
            try:
                overall_delay = int(d)
            except ValueError:
                overall_delay = 0

        return jsonify({
            "success": True,
            "data": {
                "train_number": data.get("TrainNumber", number),
                "start_date": data.get("StartDate", date),
                "current_station": {
                    "name": current.get("StationName", ""),
                    "code": current.get("StationCode", ""),
                    "scheduled_arrival": current.get("ScheduleArrival", ""),
                    "actual_arrival": current.get("ActualArrival", ""),
                    "scheduled_departure": current.get("ScheduleDeparture", ""),
                    "actual_departure": current.get("ActualDeparture", ""),
                    "delay_arrival_min": overall_delay,
                    "day": current.get("Day", 0),
                },
                "current_station_index": current_idx,
                "overall_delay_min": overall_delay,
                "route": route,
            }
        })

    except http_requests.exceptions.Timeout:
        return jsonify({
            "success": False,
            "error": "Live tracking timed out. Please try again."
        }), 504
    except http_requests.exceptions.ConnectionError:
        return jsonify({
            "success": False,
            "error": "Unable to connect to live tracking service. Please try again later."
        }), 503
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"An unexpected error occurred: {str(e)}"
        }), 500


# ─── Seat Availability (via external API) ────────────────────────────────────

@app.route("/availability", methods=["GET"])
def seat_availability():
    """Check seat availability via external Indian Rail API."""
    train = request.args.get("train", "")
    fr = request.args.get("from", "").upper()
    to = request.args.get("to", "").upper()
    date = request.args.get("date", "")
    cls = request.args.get("class", "SL")
    quota = request.args.get("quota", "GN")

    if not IRCTC_API_KEY:
        return jsonify({
            "success": False,
            "error": "Seat availability API key not configured on the server."
        }), 503

    if not train or not fr or not to or not date:
        return jsonify({
            "success": False,
            "error": "Missing required parameters: train, from, to, date."
        }), 400

    try:
        url = IRCTC_AVAIL_URL.format(apikey=IRCTC_API_KEY, train=train, fr=fr, to=to, date=date, quota=quota, cls=cls)
        resp = http_requests.get(url, timeout=20)

        if resp.status_code != 200:
            return jsonify({
                "success": False,
                "error": f"External API returned status {resp.status_code}."
            }), 502

        data = resp.json()

        if data.get("Message") != "SUCCESS":
            return jsonify({
                "success": False,
                "error": data.get("Message", "Unable to fetch availability. Please verify the details and try again.")
            })

        avail_raw = data.get("Availability", []) or []
        availability = []
        for a in avail_raw:
            availability.append({
                "date": a.get("JourneyDate", ""),
                "availability": a.get("Availability", ""),
                "confirm_pct": a.get("Confirm", ""),
            })

        return jsonify({
            "success": True,
            "data": {
                "train_number": data.get("TrainNo", train),
                "from_station": data.get("From", fr),
                "to_station": data.get("To", to),
                "class_code": data.get("ClassCode", cls),
                "quota": data.get("Quota", quota),
                "availability": availability,
            }
        })

    except http_requests.exceptions.Timeout:
        return jsonify({
            "success": False,
            "error": "Availability check timed out. Please try again."
        }), 504
    except http_requests.exceptions.ConnectionError:
        return jsonify({
            "success": False,
            "error": "Unable to connect to availability service. Please try again later."
        }), 503
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"An unexpected error occurred: {str(e)}"
        }), 500


# ─── Train History (local data) ──────────────────────────────────────────────

@app.route("/trains/<number>/history", methods=["GET"])
def train_history(number: str):
    """Get train schedule history/comparison using local data as a proxy for historical performance."""
    date = request.args.get("date", "")

    number = number.upper()
    train_info = TRAINS_MAP.get(number, TRAINS_MAP.get(number.zfill(5)))
    if not train_info:
        return jsonify({
            "success": False,
            "error": f"Train {number} not found."
        }), 404

    schedule = SCHEDULES_MAP.get(train_info["number"], [])
    station_lookup = {s["code"]: s for s in STATIONS_LIST}

    stations = []
    total_delay = 0
    max_delay = 0
    max_delay_station = ""

    for i, stop in enumerate(schedule):
        station = station_lookup.get(stop["station_code"], {})
        # Simulate small random delay for historical feel
        import random
        random.seed(hash(f"{number}-{stop['station_code']}-{date or 'today'}") % (2**31))
        delay = 0 if i in [0, len(schedule) - 1] else random.randint(0, 25)

        stations.append({
            "station_code": stop["station_code"],
            "station_name": stop["station_name"],
            "station_name_full": station.get("name", stop.get("station_name", "")),
            "state": station.get("state"),
            "scheduled_arrival": stop["arrival"],
            "scheduled_departure": stop["departure"],
            "day": stop["day"],
            "delay_min": delay,
            "is_source": i == 0,
            "is_destination": i == len(schedule) - 1,
        })

        if delay > max_delay:
            max_delay = delay
            max_delay_station = stop["station_name"]

        if not stations[-1]["is_source"]:
            total_delay += delay

    avg_delay = round(total_delay / max(len(stations) - 1, 1), 1)

    return jsonify({
        "success": True,
        "data": {
            "train_number": train_info["number"],
            "train_name": train_info["name"],
            "train_type": train_info.get("type", ""),
            "journey_date": date or "Today",
            "total_stops": len(stations),
            "total_delay_min": total_delay,
            "average_delay_min": avg_delay,
            "max_delay_min": max_delay,
            "max_delay_station": max_delay_station,
            "stations": stations,
        }
    })


# ─── Admin: Timetable Optimizer ──────────────────────────────────────────────

@app.route("/admin/trains-at-station/<station_code>", methods=["GET"])
def get_trains_at_station(station_code):
    """
    Get list of trains that stop at a given station (for debugging/testing).

    Response: { "station": str, "trains": [{"number": str, "name": str}], "count": int }
    """
    trains_at_station = []

    for train_num, schedule in SCHEDULES_MAP.items():
        for stop in schedule:
            if stop.get("station_code") == station_code:
                train_info = TRAINS_MAP.get(train_num, {})
                trains_at_station.append({
                    "number": train_num,
                    "name": train_info.get("name", train_num),
                    "arrival": stop.get("arrival"),
                    "departure": stop.get("departure")
                })
                break

    return jsonify({
        "station": station_code,
        "trains": trains_at_station[:50],  # Limit to first 50
        "count": len(trains_at_station)
    })


@app.route("/admin/optimize-timetable", methods=["POST"])
def optimize_timetable():
    """
    Optimize train departure times at a junction station to maximize transfers.

    Request body:
    {
        "stationCode": str,
        "trainNumbers": [str],
        "maxShiftMinutes": int (optional, default from config)
    }

    Response: OptimizerResult matching frontend interface
    """
    if TIMETABLE_CONFIG is None:
        return jsonify({"error": "Timetable optimizer config not loaded"}), 500

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400

    station_code = data.get("stationCode")
    train_numbers = data.get("trainNumbers", [])
    max_shift_minutes = data.get("maxShiftMinutes")

    if not station_code:
        return jsonify({"error": "stationCode is required"}), 400
    if not train_numbers or len(train_numbers) == 0:
        return jsonify({"error": "trainNumbers array is required"}), 400

    print(f"[Optimizer] Station: {station_code}, Trains: {train_numbers}")

    # Build train data from SCHEDULES_MAP
    trains = []
    trains_not_in_map = []
    trains_no_stop = []

    for train_num in train_numbers:
        if train_num not in SCHEDULES_MAP:
            trains_not_in_map.append(train_num)
            continue

        schedule = SCHEDULES_MAP[train_num]
        train_info = TRAINS_MAP.get(train_num, {})

        # Find the stop at junction station
        junction_stop = None
        for stop in schedule:
            if stop.get("station_code") == station_code:
                junction_stop = stop
                break

        if not junction_stop:
            trains_no_stop.append(train_num)
            continue  # Train doesn't stop at this station

        trains.append({
            "trainNumber": train_num,
            "trainName": train_info.get("name", train_num),
            "currentDeparture": junction_stop.get("departure", "00:00"),
            "currentArrival": junction_stop.get("arrival", "00:00"),
            "platform": None,  # Platform info not in data
            "route": [s.get("station_code") for s in schedule],
            "stopsAt": [
                {
                    "stationCode": s.get("station_code"),
                    "arrivalTime": s.get("arrival"),
                    "departureTime": s.get("departure")
                }
                for s in schedule
            ]
        })

    if len(trains) == 0:
        error_details = []
        if trains_not_in_map:
            error_details.append(f"Trains not found in schedules: {', '.join(trains_not_in_map)}")
        if trains_no_stop:
            error_details.append(f"Trains don't stop at {station_code}: {', '.join(trains_no_stop)}")

        return jsonify({
            "error": "insufficient_data",
            "message": "None of the selected trains stop at this station or schedules not found.",
            "details": " | ".join(error_details) if error_details else "Unknown reason"
        }), 400

    # Query MongoDB SearchLog for transfer pairs
    # This is a simplified version - in production, query actual SearchLog collection
    try:
        from mongodb import get_database
        db = get_database()

        # Find searches with transfers at this station involving these trains
        transfer_pairs_map = {}

        searches = db.searchLogs.find({
            "transfers": {
                "$elemMatch": {
                    "station": station_code
                }
            }
        }).limit(1000)

        for search in searches:
            transfers = search.get("transfers", [])
            for transfer in transfers:
                if transfer.get("station") != station_code:
                    continue

                from_train = transfer.get("fromTrain", "")
                to_train = transfer.get("toTrain", "")

                if from_train in train_numbers and to_train in train_numbers:
                    pair_key = f"{from_train}→{to_train}"
                    if pair_key not in transfer_pairs_map:
                        transfer_pairs_map[pair_key] = {
                            "fromTrain": from_train,
                            "toTrain": to_train,
                            "passengerCount": 0
                        }
                    transfer_pairs_map[pair_key]["passengerCount"] += 1

        transfer_pairs = list(transfer_pairs_map.values())

        # If no transfer pairs found, generate synthetic ones for testing
        if len(transfer_pairs) == 0:
            print(f"[Optimizer] No SearchLog data found, generating synthetic transfer pairs")
            for i, from_train in enumerate(train_numbers):
                for to_train in train_numbers[i+1:]:
                    transfer_pairs.append({
                        "fromTrain": from_train,
                        "toTrain": to_train,
                        "passengerCount": 10  # Default
                    })

    except Exception as e:
        print(f"[Optimizer] MongoDB query failed: {e}")
        # Fallback: generate synthetic transfer pairs for all combinations
        transfer_pairs = []
        for i, from_train in enumerate(train_numbers):
            for to_train in train_numbers[i+1:]:
                transfer_pairs.append({
                    "fromTrain": from_train,
                    "toTrain": to_train,
                    "passengerCount": 10  # Default
                })

    # Call timetable optimizer
    try:
        result, metadata = optimize_schedule(
            trains,
            transfer_pairs,
            station_code,
            TIMETABLE_CONFIG,
            max_shift_minutes
        )
    except Exception as e:
        return jsonify({"error": f"Optimization failed: {str(e)}"}), 500

    # Compute before/after metrics
    total_transfers = len(result["transferPairs"])
    successful_before = sum(1 for tp in result["transferPairs"] if tp["successBefore"])
    successful_after = sum(1 for tp in result["transferPairs"] if tp["successAfter"])
    problematic_before = total_transfers - successful_before
    problematic_after = total_transfers - successful_after

    success_rate_before = int((successful_before / total_transfers * 100) if total_transfers > 0 else 0)
    success_rate_after = int((successful_after / total_transfers * 100) if total_transfers > 0 else 0)

    # Format recommended changes
    recommended_changes = []
    for train in result["trains"]:
        if not train["changed"]:
            continue

        # Count impacted connections
        impacted = sum(
            1 for tp in result["transferPairs"]
            if tp["fromTrain"] == train["trainNumber"] or tp["toTrain"] == train["trainNumber"]
        )

        # Compute improvement score (transfers made feasible)
        improvement = sum(
            1 for tp in result["transferPairs"]
            if (tp["fromTrain"] == train["trainNumber"] or tp["toTrain"] == train["trainNumber"])
            and tp["successAfter"] and not tp["successBefore"]
        )

        recommended_changes.append({
            "trainNumber": train["trainNumber"],
            "trainName": train["trainName"],
            "currentDeparture": train["originalDeparture"],
            "recommendedDeparture": train["optimizedDeparture"],
            "shiftMinutes": train["shiftMinutes"],
            "reason": f"Improves {improvement} transfer(s)" if improvement > 0 else "Maintains optimal timing",
            "impactedConnections": impacted,
            "improvementScore": improvement * 10,
            "route": train["route"],
            "stopsAt": train["stopsAt"]
        })

    # Build response
    response = {
        "stationCode": station_code,
        "maxShiftMinutes": max_shift_minutes or TIMETABLE_CONFIG["maxShiftWindowMinutes"],
        "before": {
            "avgWaitingTime": 300,  # Placeholder - would compute from actual data
            "successRate": success_rate_before,
            "totalTransfers": total_transfers,
            "problematicConnections": problematic_before
        },
        "after": {
            "avgWaitingTime": 280,  # Placeholder
            "successRate": success_rate_after,
            "totalTransfers": total_transfers,
            "problematicConnections": problematic_after
        },
        "recommendedChanges": recommended_changes,
        "optimizerMetadata": metadata,
        "recommendations": []  # Placeholder for compatibility
    }

    return jsonify(response)


@app.route("/admin/dashboard-metrics", methods=["GET"])
def get_dashboard_metrics():
    """
    Get dashboard metrics with realistic demo data.
    In production, this would query MongoDB searchLogs collection.
    """
    # Demo data simulating 30 days of journey planning activity
    demo_metrics = {
        "totalSearches": 15847,
        "totalTransfers": 8923,
        "successfulTransfers": 6842,
        "failedTransfers": 2081,
        "successRate": 77,  # 6842/8923 * 100
        "avgWaitingTime": 32  # Average waiting time in minutes
    }

    return jsonify(demo_metrics)


@app.route("/admin/transfer-analytics", methods=["GET"])
def get_transfer_analytics():
    """
    Get transfer analytics with realistic demo data.
    Shows station performance and problematic train pairs.
    """
    # Demo data for major junction stations
    station_data = [
        # High-performing stations
        {"station": "NDLS", "successRate": 85.2, "total": 1245, "successful": 1061, "failed": 184, "avgWaitTime": 28},
        {"station": "BCT", "successRate": 82.7, "total": 987, "successful": 816, "failed": 171, "avgWaitTime": 31},
        {"station": "HWH", "successRate": 81.4, "total": 1098, "successful": 894, "failed": 204, "avgWaitTime": 29},
        {"station": "CSMT", "successRate": 79.3, "total": 876, "successful": 695, "failed": 181, "avgWaitTime": 33},
        {"station": "MAS", "successRate": 78.1, "total": 743, "successful": 580, "failed": 163, "avgWaitTime": 35},

        # Medium-performing stations
        {"station": "SBC", "successRate": 74.5, "total": 654, "successful": 487, "failed": 167, "avgWaitTime": 38},
        {"station": "PUNE", "successRate": 72.8, "total": 589, "successful": 429, "failed": 160, "avgWaitTime": 36},
        {"station": "JP", "successRate": 71.2, "total": 512, "successful": 365, "failed": 147, "avgWaitTime": 42},
        {"station": "AGC", "successRate": 69.7, "total": 478, "successful": 333, "failed": 145, "avgWaitTime": 44},
        {"station": "BZA", "successRate": 68.3, "total": 445, "successful": 304, "failed": 141, "avgWaitTime": 46},

        # Lower-performing stations (need optimization)
        {"station": "VSKP", "successRate": 64.5, "total": 398, "successful": 257, "failed": 141, "avgWaitTime": 52},
        {"station": "NGP", "successRate": 62.1, "total": 367, "successful": 228, "failed": 139, "avgWaitTime": 55},
        {"station": "BPL", "successRate": 59.8, "total": 334, "successful": 200, "failed": 134, "avgWaitTime": 58},
        {"station": "GKP", "successRate": 57.2, "total": 298, "successful": 171, "failed": 127, "avgWaitTime": 61},
        {"station": "CNB", "successRate": 54.6, "total": 267, "successful": 146, "failed": 121, "avgWaitTime": 64}
    ]

    # Problematic train pairs that frequently have failed transfers
    problematic_pairs = [
        {"trainPair": "12301 → 12302", "totalAttempts": 156, "failures": 78, "successRate": 50},
        {"trainPair": "12951 → 12952", "totalAttempts": 143, "failures": 68, "successRate": 52},
        {"trainPair": "12429 → 12430", "totalAttempts": 128, "failures": 59, "successRate": 54},
        {"trainPair": "12615 → 12616", "totalAttempts": 119, "failures": 52, "successRate": 56},
        {"trainPair": "12801 → 12802", "totalAttempts": 107, "failures": 46, "successRate": 57},
        {"trainPair": "12625 → 12626", "totalAttempts": 98, "failures": 41, "successRate": 58},
        {"trainPair": "12259 → 12260", "totalAttempts": 89, "failures": 36, "successRate": 60},
        {"trainPair": "12841 → 12842", "totalAttempts": 82, "failures": 32, "successRate": 61},
        {"trainPair": "12621 → 12622", "totalAttempts": 76, "failures": 29, "successRate": 62},
        {"trainPair": "12273 → 12274", "totalAttempts": 71, "failures": 26, "successRate": 63}
    ]

    analytics = {
        "stationSuccessRates": station_data,
        "problematicTrainPairs": problematic_pairs
    }

    return jsonify(analytics)


@app.route("/admin/station-details/<code>", methods=["GET"])
def get_station_details(code):
    """
    Get detailed transfer analytics for a specific station.
    Shows transfer performance and top train pairs.
    """
    code = code.upper()

    # Demo data for different stations
    station_demos = {
        "NDLS": {
            "stationCode": "NDLS",
            "totalTransfers": 1245,
            "successfulTransfers": 1061,
            "failedTransfers": 184,
            "successRate": 85,
            "avgWaitingTime": 28,
            "topTrainPairs": [
                {"trainPair": "12301 → 12429", "count": 89},
                {"trainPair": "12951 → 12302", "count": 76},
                {"trainPair": "12429 → 12951", "count": 68},
                {"trainPair": "12302 → 12429", "count": 54},
                {"trainPair": "12301 → 12951", "count": 47}
            ]
        },
        "BCT": {
            "stationCode": "BCT",
            "totalTransfers": 987,
            "successfulTransfers": 816,
            "failedTransfers": 171,
            "successRate": 83,
            "avgWaitingTime": 31,
            "topTrainPairs": [
                {"trainPair": "12951 → 12952", "count": 72},
                {"trainPair": "12953 → 12954", "count": 65},
                {"trainPair": "12955 → 12956", "count": 58},
                {"trainPair": "12957 → 12958", "count": 51},
                {"trainPair": "12951 → 12953", "count": 44}
            ]
        },
        "HWH": {
            "stationCode": "HWH",
            "totalTransfers": 1098,
            "successfulTransfers": 894,
            "failedTransfers": 204,
            "successRate": 81,
            "avgWaitingTime": 29,
            "topTrainPairs": [
                {"trainPair": "12301 → 12303", "count": 84},
                {"trainPair": "12305 → 12307", "count": 71},
                {"trainPair": "12303 → 12305", "count": 63},
                {"trainPair": "12301 → 12305", "count": 56},
                {"trainPair": "12307 → 12301", "count": 49}
            ]
        },
        "CSMT": {
            "stationCode": "CSMT",
            "totalTransfers": 876,
            "successfulTransfers": 695,
            "failedTransfers": 181,
            "successRate": 79,
            "avgWaitingTime": 33,
            "topTrainPairs": [
                {"trainPair": "12123 → 12124", "count": 67},
                {"trainPair": "12125 → 12126", "count": 59},
                {"trainPair": "12127 → 12128", "count": 52},
                {"trainPair": "12123 → 12125", "count": 46},
                {"trainPair": "12124 → 12127", "count": 41}
            ]
        },
        "MAS": {
            "stationCode": "MAS",
            "totalTransfers": 743,
            "successfulTransfers": 580,
            "failedTransfers": 163,
            "successRate": 78,
            "avgWaitingTime": 35,
            "topTrainPairs": [
                {"trainPair": "12601 → 12602", "count": 61},
                {"trainPair": "12603 → 12604", "count": 54},
                {"trainPair": "12605 → 12606", "count": 48},
                {"trainPair": "12601 → 12603", "count": 42},
                {"trainPair": "12602 → 12605", "count": 37}
            ]
        },
        "SBC": {
            "stationCode": "SBC",
            "totalTransfers": 654,
            "successfulTransfers": 487,
            "failedTransfers": 167,
            "successRate": 75,
            "avgWaitingTime": 38,
            "topTrainPairs": [
                {"trainPair": "12627 → 12628", "count": 53},
                {"trainPair": "12629 → 12630", "count": 47},
                {"trainPair": "12631 → 12632", "count": 41},
                {"trainPair": "12627 → 12629", "count": 36},
                {"trainPair": "12628 → 12631", "count": 32}
            ]
        }
    }

    # If station code is in demos, return it
    if code in station_demos:
        return jsonify(station_demos[code])

    # Otherwise, generate generic data for any station
    # Randomize slightly based on station code hash for consistency
    code_hash = sum(ord(c) for c in code)
    base_total = 200 + (code_hash % 300)
    base_rate = 65 + (code_hash % 20)

    total = base_total
    rate = base_rate
    successful = int(total * rate / 100)
    failed = total - successful
    avg_wait = 25 + (code_hash % 35)

    generic_data = {
        "stationCode": code,
        "totalTransfers": total,
        "successfulTransfers": successful,
        "failedTransfers": failed,
        "successRate": rate,
        "avgWaitingTime": avg_wait,
        "topTrainPairs": [
            {"trainPair": f"12{(code_hash % 9) + 1}01 → 12{(code_hash % 9) + 1}02", "count": 45 + (code_hash % 20)},
            {"trainPair": f"12{(code_hash % 9) + 1}03 → 12{(code_hash % 9) + 1}04", "count": 38 + (code_hash % 15)},
            {"trainPair": f"12{(code_hash % 9) + 1}05 → 12{(code_hash % 9) + 1}06", "count": 32 + (code_hash % 12)},
            {"trainPair": f"12{(code_hash % 9) + 1}07 → 12{(code_hash % 9) + 1}08", "count": 27 + (code_hash % 10)},
            {"trainPair": f"12{(code_hash % 9) + 1}09 → 12{(code_hash % 9) + 1}10", "count": 23 + (code_hash % 8)}
        ]
    }

    return jsonify(generic_data)


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

    # Connect to MongoDB
    print("\nConnecting to MongoDB...")
    connect_to_mongodb()

    print("\nServer starting on http://localhost:5000")
    print("Endpoints:")
    print("  POST /route                         - Find multi-train route")
    print("  POST /delay-risk                    - AI delay risk (lazy, per route)")
    print("  GET  /health                        - Health check")
    print("  GET  /info                          - Graph info")
    print("  GET  /stations                      - Search stations")
    print("  GET  /stations/all                  - All stations (for frontend cache)")
    print("  GET  /stations/<code>/board         - Station board")
    print("  GET  /trains/search                 - Search trains")
    print("  GET  /trains/<number>               - Train info + schedule")
    print("  GET  /trains/<number>/live          - Live train tracking")
    print("  GET  /trains/<number>/history       - Train history")
    print("  GET  /fare                          - Fare lookup")
    print("  GET  /pnr/<pnr>                     - PNR status check")
    print("  GET  /availability                  - Seat availability")
    print("  GET  /admin/dashboard-metrics       - Dashboard metrics")
    print("  GET  /admin/transfer-analytics      - Transfer analytics")
    print("  GET  /admin/station-details/<code>  - Station details")
    print("  POST /admin/optimize-timetable      - Optimize junction timetable")
    print("=" * 60)

    try:
        app.run(debug=False, port=5000, threaded=True)
    finally:
        disconnect_from_mongodb()
