"""
n8n Webhook Service — Delay Risk Assessment

Sends route data to the n8n workflow webhook and returns a structured
delay risk assessment (riskScore, description, recommendation).

Design principles:
- Single responsibility: only handles n8n communication.
- Reads webhook URL from environment variable N8NWEBHOOK.
- Async-friendly (uses concurrent.futures for thread-pool calls).
- Retries once on transient failures (connection errors / 5xx).
- Waits up to 60 s for the AI response (Bedrock can take 10-30 s).
- Returns a safe default on any failure so the caller can continue.
"""

import json
import os
import logging
import re
import requests

logger = logging.getLogger(__name__)

# ── Config ────────────────────────────────────────────────────────────────────

N8N_WEBHOOK_URL: str = os.environ.get("N8NWEBHOOK", "").strip()
REQUEST_TIMEOUT: int = 60   # seconds per attempt — AI (Bedrock) can take 10–30 s
MAX_RETRIES: int = 1        # one retry on transient failure

# ── Default / fallback risk object ───────────────────────────────────────────

DEFAULT_RISK = {
    "riskScore": None,
    "description": "Delay analysis unavailable.",
    "recommendation": "Check live train status before departure.",
    "available": False,
}


def _post_to_webhook(payload: dict) -> dict:
    """
    POST *payload* to the n8n webhook and return the parsed JSON response.
    Raises requests.RequestException on failure (caller handles retries).
    """
    resp = requests.post(
        N8N_WEBHOOK_URL,
        json=payload,
        timeout=REQUEST_TIMEOUT,
        headers={"Content-Type": "application/json"},
    )
    resp.raise_for_status()
    logger.info("[n8n] Response status=%d body=%s", resp.status_code, resp.text[:500])
    return resp.json()


def _is_transient(exc: Exception) -> bool:
    """Return True for errors that warrant a single retry."""
    if isinstance(exc, requests.exceptions.Timeout):
        return True
    if isinstance(exc, requests.exceptions.ConnectionError):
        return True
    if isinstance(exc, requests.HTTPError):
        status = exc.response.status_code if exc.response is not None else 0
        return status >= 500
    return False


def fetch_delay_risk(payload: dict) -> dict:
    """
    Call the n8n webhook with *payload* and return the delay-risk dict.

    On success the returned dict looks like:
        {
            "riskScore": 67,
            "description": "...",
            "recommendation": "...",
            "available": True,
        }

    On any failure the DEFAULT_RISK sentinel is returned so that the caller
    can display routes without blocking on AI analysis.
    """
    if not N8N_WEBHOOK_URL:
        logger.warning("N8NWEBHOOK env var is not set — skipping delay risk analysis.")
        return DEFAULT_RISK

    last_exc: Exception | None = None

    for attempt in range(1 + MAX_RETRIES):
        try:
            data = _post_to_webhook(payload)
            logger.info("[n8n] Raw response: %s", data)

            # ── Parse the n8n AI Agent response ──────────────────────────────
            # The AI Agent node returns: {"output": "json\n{...}"} or
            # {"output": "{...}"} — the actual risk object is embedded as
            # a JSON string inside the `output` field.
            # We also handle the case where n8n forwards the parsed JSON
            # directly at the top level (riskScore at root).

            risk_score = None
            description = ""
            recommendation = ""

            if "riskScore" in data:
                # Flat top-level JSON (ideal case)
                risk_score = data.get("riskScore")
                description = data.get("description", "")
                recommendation = data.get("recommendation", "")
            else:
                # AI Agent wraps everything in an "output" text field
                raw_output = (
                    data.get("output")
                    or data.get("text")
                    or data.get("message")
                    or ""
                )
                if isinstance(raw_output, dict):
                    # Already a dict — use directly
                    risk_score = raw_output.get("riskScore")
                    description = raw_output.get("description", "")
                    recommendation = raw_output.get("recommendation", "")
                else:
                    # Strip markdown code fences and extract the first JSON block
                    text = str(raw_output)
                    # Remove ```json ... ``` or ``` ... ```
                    text = re.sub(r"```(?:json)?\s*", "", text)
                    # Find the first {...} block
                    match = re.search(r"\{[^{}]*\}", text, re.DOTALL)
                    if match:
                        try:
                            parsed = json.loads(match.group())
                            risk_score = parsed.get("riskScore")
                            description = parsed.get("description", "")
                            recommendation = parsed.get("recommendation", "")
                        except json.JSONDecodeError:
                            logger.warning("[n8n] Could not parse embedded JSON: %s", match.group())
                    else:
                        logger.warning("[n8n] No JSON block found in output: %s", text[:200])

            logger.info("[n8n] Risk score=%s desc=%s", risk_score, description[:60] if description else "")

            return {
                "riskScore": risk_score,
                "description": description,
                "recommendation": recommendation,
                "available": True,
            }

        except Exception as exc:
            last_exc = exc
            if attempt < MAX_RETRIES and _is_transient(exc):
                logger.info("n8n webhook transient error (attempt %d/%d): %s — retrying…",
                            attempt + 1, 1 + MAX_RETRIES, exc)
                continue
            break

    # All attempts exhausted
    logger.warning("n8n webhook unavailable after %d attempt(s): %s",
                   MAX_RETRIES + 1, last_exc)
    return DEFAULT_RISK


def enrich_routes_with_delay_risk(route_response: dict) -> dict:
    """
    Given the full route-response dict (as returned by the /route endpoint),
    call the n8n webhook once with the entire payload, then distribute the
    per-route risk scores back onto each route object.

    The n8n workflow receives a single request containing all routes, which
    lets the AI reason about relative risk across options.

    Expected n8n response shape (single assessment per call):
        { "riskScore": 67, "description": "...", "recommendation": "..." }

    The same assessment is applied to every route in this call because the
    n8n workflow operates on the journey as a whole (origin → destination).
    If the workflow later supports per-route responses, this function can be
    updated to distribute individual assessments.
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed

    routes = route_response.get("routes", [])
    if not routes:
        return route_response

    # Build per-route payloads and dispatch concurrently (one call per route)
    def assess_route(route: dict) -> dict:
        origin = route_response.get("from", "Unknown")
        destination = route_response.get("to", "Unknown")
        date = route_response.get("date", "Unknown")
        trains = ", ".join(
            seg.get("train_name", seg.get("train_number", "Unknown"))
            for seg in route.get("segments", [])
        ) or "Unknown"
        duration_min = route.get("total_duration", 0)
        hours, mins = divmod(duration_min, 60)
        duration_str = f"{hours}h {mins}m" if hours else f"{mins}m"

        chat_prompt = (
            f"Analyze the delay risk for this train journey:\n"
            f"From: {origin}\n"
            f"To: {destination}\n"
            f"Date: {date}\n"
            f"Train(s): {trains}\n"
            f"Total Duration: {duration_str}\n"
            f"Route details: {route}\n\n"
            f"Respond with a JSON object containing:\n"
            f'  "riskScore": integer 0-100 (0=no risk, 100=very high risk),\n'
            f'  "description": short explanation of the risk,\n'
            f'  "recommendation": actionable advice for the traveller.'
        )

        payload = {
            "chatInput": chat_prompt,
            "date": date,
            "from": origin,
            "to": destination,
            "status": route_response.get("status"),
            "routes": [route],
        }
        return fetch_delay_risk(payload)

    risk_results: list[dict] = [DEFAULT_RISK] * len(routes)

    with ThreadPoolExecutor(max_workers=min(len(routes), 5)) as executor:
        future_to_idx = {
            executor.submit(assess_route, route): i
            for i, route in enumerate(routes)
        }
        for future in as_completed(future_to_idx):
            idx = future_to_idx[future]
            try:
                risk_results[idx] = future.result()
            except Exception as exc:
                logger.warning("Unexpected error assessing route %d: %s", idx + 1, exc)
                risk_results[idx] = DEFAULT_RISK

    # Attach results back to each route
    for i, route in enumerate(routes):
        route["delayRisk"] = risk_results[i]

    return route_response
