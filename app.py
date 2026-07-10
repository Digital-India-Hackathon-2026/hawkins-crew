"""
Web server for railway routes with persistent in-memory graph.

Graph loads once on startup, stays in memory for fast queries.
"""

from flask import Flask, request, jsonify
from datetime import datetime
import pickle
import os

from advanced_route_finder import AdvancedRouteFinder


app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False
app.json.compact = False

# Global route finder - loaded once on startup
finder = None
GRAPH_LOADING = False
ERROR_MSG = None


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


@app.route("/health", methods=["GET"])
def health():
    """Health check."""
    if finder is not None:
        return jsonify({
            "status": "ready",
            "nodes": finder.G.number_of_nodes(),
            "edges": finder.G.number_of_edges()
        })
    elif GRAPH_LOADING:
        return jsonify({"status": "loading"}), 202
    else:
        return jsonify({"status": "error", "message": ERROR_MSG}), 500


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


if __name__ == "__main__":
    # Load graph on startup
    print("RailConnect Route Server")
    print("=" * 60)
    print("Starting graph load...")

    load_graph()

    if finder is None:
        print("Error: Failed to load graph")
        exit(1)

    print("\nServer starting on http://localhost:5000")
    print("Endpoints:")
    print("  POST /route - Find route")
    print("  GET  /health - Health check")
    print("  GET  /info - Graph info")
    print("=" * 60)

    app.run(debug=False, port=5000, threaded=True)
