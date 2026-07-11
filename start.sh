#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# start.sh — Production start script for Prayan Railway backend
#
# Usage:
#   chmod +x start.sh
#   ./start.sh
#
# Env vars (set in .env or your deploy platform):
#   ALLOWED_ORIGINS   Comma-separated frontend origins  (e.g. https://yourdomain.com)
#   MONGODB_URI       MongoDB connection string
#   N8NWEBHOOK        n8n webhook URL for delay risk AI
#   IRCTC_API_KEY     API key for PNR/live tracking/availability
#   PORT              Port to bind (default: 5000)
#   WORKERS           gunicorn worker count (default: 2)
#   THREADS           threads per worker (default: 4)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

PORT="${PORT:-5000}"
WORKERS="${WORKERS:-2}"
THREADS="${THREADS:-4}"

echo "Starting Prayan Railway backend..."
echo "  Bind:    0.0.0.0:${PORT}"
echo "  Workers: ${WORKERS} × ${THREADS} threads"
echo ""

exec uv run gunicorn wsgi:app \
    --workers "${WORKERS}" \
    --threads "${THREADS}" \
    --worker-class gthread \
    --bind "0.0.0.0:${PORT}" \
    --timeout 120 \
    --graceful-timeout 30 \
    --keep-alive 5 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
