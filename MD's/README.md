# RailConnect — Intelligent Multi-Train Journey Recommendation System

> **Digital India Hackathon 2026** | Domain: Digital Governance & Public Services  
> Built by **Hawkins Crew**

RailConnect is an AI-assisted journey-planning platform for Indian Railways. It finds the best multi-train combinations between any two stations, visualizes them on an interactive map, and provides a complete suite of passenger utilities — PNR status, live tracking, seat availability, fare estimates, station boards, and more.

For railway administrators, it offers a real-time analytics dashboard to monitor transfer success rates, identify problematic connections, and simulate timetable optimizations.

---

## Table of Contents

- [Overview](#overview)
- [Demo](#demo)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
  - [Environment Variables](#environment-variables)
  - [Seeding Demo Data](#seeding-demo-data)
- [Running the Project](#running-the-project)
- [API Reference](#api-reference)
- [Algorithm & Routing Engine](#algorithm--routing-engine)
- [Screenshots](#screenshots)
- [Team](#team)
- [License & Acknowledgments](#license--acknowledgments)

---

## Overview

India’s railway network connects 8,000+ stations and runs 5,000+ trains, yet many journeys lack a direct connection. Passengers currently have to manually compare schedules across multiple trains, guess feasible layovers, and estimate whether a tight transfer is realistic.

RailConnect automates this with a **time-expanded graph** built from real Indian Railways schedules. It finds chronologically valid, multi-train routes and ranks them by travel time, waiting time, number of transfers, and station connectivity. The result is displayed as an interactive, multi-route map with a side-by-side comparison of alternatives.

---

## Demo

```bash
# Backend
python app.py

# Frontend
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and try searching **NDLS → MAQ** or **CSMT → PUNE**.

---

## Features

### Core Journey Planning
- **Multi-train route discovery** — finds valid routes with 0, 1, or 2+ transfers.
- **Multi-criteria ranking** — optimizes for total duration, waiting time, transfer count, and station centrality.
- **Chronologically valid paths** — every connection respects real train schedules and a minimum transfer window.
- **Interactive multi-route map** — all suggested routes shown simultaneously; click any route to focus.
- **Station autocomplete** — fuzzy search powered by Fuse.js across 8,990+ stations.

### Passenger Utilities
- **PNR Status** — check booking status via external Indian Rail API.
- **Live Train Tracking** — real-time position and delay information.
- **Seat Availability** — class-wise availability lookup.
- **Fare Lookup** — estimated fares by class and distance.
- **Train Search & Info** — detailed schedules, stops, and class composition.
- **Station Board** — arrivals and departures at any station.
- **Train History** — simulated historical on-time performance.

### Admin Dashboard
- **Dashboard metrics** — total searches, transfers, success rate, average wait time.
- **Transfer analytics** — station success rates and problematic train pairs.
- **Station details** — per-station transfer metrics and top connections.
- **Timetable optimizer** — simulated shift analysis to improve connection success.
- **Recommendation feed** — actionable suggestions for timetable improvements.

---

## Architecture

```mermaid
graph TD
    A[Next.js Frontend
    localhost:3000] -->|HTTP| B[Flask Backend
    localhost:5000]
    B -->|Query| C[Pre-built graph.pkl
    Time-expanded graph]
    B -->|Read| D[stations.json / trains.json / schedules.json]
    B -->|Aggregate| E[(MongoDB Atlas)]
    A -->|Internal API Routes| F[Next.js API Routes
    /api/admin/*, /api/logs/*]
    F -->|Write / Read| E
```

### Data Flow
1. The backend loads `stations.json`, `trains.json`, and `schedules.json` into memory at startup.
2. A pre-built time-expanded graph (`graph.pkl`) is loaded into `AdvancedRouteFinder` for sub-second route queries.
3. The frontend calls the Flask backend for route search and utility lookups.
4. Search logs are stored in MongoDB via Next.js API routes for admin analytics.

---

## Tech Stack

### Backend
| Layer | Technology |
|-------|------------|
| Language | Python 3.14+ |
| Web Framework | Flask 3.1+ |
| Graph Algorithms | NetworkX |
| Data Processing | NumPy, Pandas |
| Database | MongoDB (PyMongo) |
| External APIs | Indian Rail API (PNR, live status, availability) |
| CORS | flask-cors |

### Frontend
| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| UI Library | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Animations | Framer Motion |
| Icons | Lucide React |
| Maps | Leaflet + react-leaflet |
| Search | Fuse.js |
| Charts | Recharts |
| Data Fetching | Axios + SWR |

---

## Project Structure

```
hawkins-crew/
├── app.py                          # Flask server (loads graph + static data)
├── advanced_route_finder.py        # Multi-criteria routing engine
├── build_graph.py                  # Build time-expanded graph.pkl
├── mongodb.py                      # MongoDB connection utilities
├── main.py                         # CLI entry point
├── graph.pkl                       # Pre-built railway network graph
├── stations.json                   # 8,990+ station records (GeoJSON)
├── trains.json                     # 5,200+ train records (GeoJSON)
├── schedules.json                  # 417K+ schedule entries
├── requirements.txt                # Python dependencies
├── pyproject.toml                  # Python project config
├── .env                            # Environment variables
└── frontend/                       # Next.js application
    ├── app/
    │   ├── page.tsx                # Home + route search
    │   ├── layout.tsx              # Root layout
    │   ├── admin/                  # Admin dashboard pages
    │   ├── utilities/              # Passenger utility pages
    │   └── api/                    # Next.js API routes
    ├── components/
    │   ├── map/                    # Multi-route map components
    │   ├── journey/                # Route cards & timeline
    │   ├── search/                 # Station search card
    │   ├── utility/                # Utility layouts
    │   ├── admin/                  # Admin charts & tables
    │   └── layout/                 # Navbar, Footer
    ├── contexts/
    │   └── StationsContext.tsx     # Global station data
    ├── lib/
    │   ├── api.ts                  # Backend API client
    │   ├── db.ts                   # MongoDB client
    │   └── map/                    # Map utilities
    ├── scripts/
    │   └── seedDemoLogs.ts         # Demo data seeder
    ├── package.json
    └── next.config.ts
```

---

## Getting Started

### Prerequisites

- **Python** 3.14 or higher
- **Node.js** 20 or higher
- **MongoDB** instance (local or Atlas)
- **npm** or **yarn**
- **uv** (recommended for Python package management)

### Backend Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd hawkins-crew
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   # On Windows: .venv\Scripts\activate
   ```

3. Install Python dependencies:
   ```bash
   # Using uv (recommended)
   uv pip install -r requirements.txt

   # Or using pip
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```bash
   # .env
   MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?appName=Cluster0
   IRCTC_API_KEY=your_irctc_api_key        # Optional: for PNR/live/availability
   ```

5. Build the graph (if `graph.pkl` is missing or data has changed):
   ```bash
   python build_graph.py
   ```

### Frontend Setup

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

   > **Note:** If `NODE_ENV=production` is set in your shell, devDependencies like Tailwind CSS will not install. Run `NODE_ENV=development npm install` instead.

2. Create the frontend environment file:
   ```bash
   # frontend/.env.local
   NEXT_PUBLIC_API_URL=http://localhost:5000
   MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/?appName=Cluster0
   ```

### Seeding Demo Data

To populate the admin dashboard with sample analytics, run:

```bash
cd frontend
npm run seed
```

This inserts 50 realistic journey search logs into MongoDB.

---

## Running the Project

### Start the Backend

```bash
# From project root
python app.py
```

The Flask server starts on `http://localhost:5000` and loads the graph into memory.

### Start the Frontend

```bash
cd frontend
npm run dev
```

The Next.js app starts on `http://localhost:3000`.

### Production Build

```bash
# Frontend
cd frontend
npm run build
npm start
```

---

## API Reference

### Route Planning

#### `POST /route`
Find optimal multi-train routes.

**Request Body:**
```json
{
  "from": "NDLS",
  "to": "MAQ",
  "date": "2026-07-15"
}
```

**Response:**
```json
{
  "status": "found",
  "from": "NDLS",
  "to": "MAQ",
  "date": "2026-07-15",
  "routes": [
    {
      "rank": 1,
      "segments": [...],
      "total_duration": 3600,
      "total_waiting": 1800,
      "num_transfers": 1,
      "trains_used": ["12137", "12919"],
      "score": 5400.0,
      "score_breakdown": {
        "travel_time": 2400,
        "transfer_penalty": 600,
        "waiting_time": 1800,
        "centrality_bonus": 600
      }
    }
  ]
}
```

### Stations & Trains

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Server + graph health check |
| `/info` | GET | Graph metadata (nodes, edges) |
| `/stations` | GET | Search stations by code/name |
| `/stations/all` | GET | All stations for frontend cache |
| `/stations/<code>/board` | GET | Station arrivals/departures |
| `/trains/search` | GET | Search trains by number/name or between stations |
| `/trains/<number>` | GET | Train info + full schedule |
| `/trains/<number>/live` | GET | Live tracking (requires `IRCTC_API_KEY`) |
| `/trains/<number>/history` | GET | Historical on-time performance |
| `/fare` | GET | Estimated fare between stations |
| `/pnr/<pnr>` | GET | PNR status (requires `IRCTC_API_KEY`) |
| `/availability` | GET | Seat availability (requires `IRCTC_API_KEY`) |

### Admin Analytics (Next.js API Routes)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/dashboard-metrics` | GET | Aggregated dashboard metrics |
| `/api/admin/transfer-analytics` | GET | Station success rates & problematic pairs |
| `/api/admin/station/<code>` | GET | Per-station transfer details |
| `/api/admin/optimize` | POST | Mock timetable optimization |
| `/api/logs/search` | POST | Store a search log |

---

## Algorithm & Routing Engine

### Time-Expanded Graph

Each train stop is represented as a node: `train_number_stop_sequence`. Two types of edges connect these nodes:

1. **Travel edges** — link consecutive stops of the same train, weighted by actual travel time.
2. **Transfer edges** — link an arrival node to a departure node at the same station, weighted by waiting time, but only if the wait falls within a configurable window (default: 10 min to 4 hrs).

### Smart Transfer Pruning

At busy stations, creating edges to every later departure would explode the graph size. Instead, for each arriving train we connect only to the **earliest feasible departure** on each distinct outgoing train. This preserves routing correctness while keeping the graph compact and queries fast.

### Multi-Criteria Optimization

Routes are ranked by a weighted score that combines:

- **Travel time** — shorter total journey is better.
- **Waiting time** — minimize layover duration.
- **Transfer penalty** — each additional transfer incurs a fixed cost.
- **Centrality bonus** — major junctions (high closeness centrality) are preferred for more reliable connections.

### Path Validity

- All connections are chronologically ordered.
- Minimum transfer time is enforced.
- Loop prevention ensures passengers never revisit a station on the same route.
- Trains must run in the correct direction (stop sequences must increase).

---

## Screenshots

> _Screenshots will be added here. Run the app locally and capture the home page, multi-route map, and admin dashboard._

---

## Team

**Hawkins Crew**

| Name | Role | GitHub |
|------|------|--------|
| Rohith Anumalasetty | Backend & Routing Engine | [@nxtrohith](https://github.com/nxtrohith) |
| Vaishali Ragi | Frontend & UI/UX | [@vaishaliragi66-rgb](https://github.com/vaishaliragi66-rgb) |
| Anudeep Reddy Veerati | Full-Stack & Integration | [@AnudeepReddyVeerati](https://github.com/AnudeepReddyVeerati) |

---

## License & Acknowledgments

This project was developed for the **Digital India Hackathon 2026** under the **Digital Governance & Public Services** domain.

- Railway data inspired by publicly available Indian Railways schedules.
- External services (PNR, live status, availability) use the Indian Rail API and require a valid API key.
- Built with open-source tools: Flask, NetworkX, Next.js, React, Tailwind CSS, Leaflet, Framer Motion, and Recharts.

---

## Notes

- The **timetable optimizer** and **recommendations** pages currently use mock data. They are designed to be swapped for a real OR-Tools / CP-SAT backend without changing the UI.
- The **admin dashboard** has no authentication layer. Add one before deploying to production.
- For production deployment, ensure `IRCTC_API_KEY` is kept server-side and never exposed in the frontend bundle.

---

**Happy travels!** 🚆
