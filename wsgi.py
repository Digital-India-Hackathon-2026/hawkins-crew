"""
WSGI entry point for production use with gunicorn.

Usage:
    uv run gunicorn wsgi:app --workers 2 --threads 4 --bind 0.0.0.0:5000 --timeout 120

The `if __name__ == '__main__'` block in app.py is NOT executed by gunicorn,
so all startup logic (data load, graph, MongoDB) lives here instead.
"""

from dotenv import load_dotenv
load_dotenv()

from app import app, load_static_data, load_graph, finder
from mongodb import connect_to_mongodb

import os
import sys

print("=" * 60)
print("Prayan Railway — Production Server (gunicorn)")
print("=" * 60)

# Load static data (stations, trains, schedules)
load_static_data()

# Load the route graph
load_graph()

# Bail early if graph failed to load — gunicorn will still start but every
# /route request will return 503. Print a loud warning so ops notices.
if finder is None:
    print("WARNING: Graph failed to load! Route planning will be unavailable.", file=sys.stderr)

# Connect to MongoDB (journey logs, admin dashboard)
print("\nConnecting to MongoDB...")
connect_to_mongodb()

print("\nStartup complete. Handing off to gunicorn workers...")
print("=" * 60)

# `app` is the Flask application object imported above.
# gunicorn imports this module and binds to `wsgi:app`.
