# RailConnect - Intelligent Multi-Train Journey Recommendation System

**Digital India Hackathon 2026 | Team: Hawkins Crew**

RailConnect is an intelligent journey planning system that automatically discovers the best multi-train travel combinations between any source and destination in India's vast railway network. Using historical train movement data and advanced graph algorithms, it predicts connection reliability and recommends optimized routes for seamless multi-train journeys.

## Problem Statement

India's railway network connects thousands of destinations, yet passengers traveling between locations without direct train services face significant challenges:
- Manually comparing train schedules across multiple connections
- Estimating delays and assessing connection feasibility
- Planning for long waiting periods at interchange stations
- Uncertainty about successful transfers

## Solution

RailConnect addresses these challenges through:

### Core Features
- **Multi-Train Route Discovery**: Automatically finds optimal multi-train combinations between any source and destination
- **Intelligent Route Optimization**: Uses multi-criteria ranking considering:
  - Total travel time
  - Waiting duration at transfers
  - Number of transfers required
  - Station centrality (connectivity importance)
- **Chronologically Valid Paths**: Ensures all connections respect actual train schedules and transfer time requirements
- **Multiple Route Suggestions**: Provides alternative routes with different trade-offs

### Smart Travel Assistance
- Real-time route finding with persistent in-memory graph for fast queries
- Station facility recommendations for layovers
- Interactive map-based interface
- Comprehensive station and train information

## Tech Stack

### Backend
- **Python 3.14**: Core application language
- **Flask 3.1+**: Web server and REST API
- **NetworkX**: Graph algorithms and route optimization
- **MongoDB**: Database for persistent storage
- **NumPy & Pandas**: Data processing and analysis

### Frontend
- **Next.js 16**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS 4**: Styling framework
- **Framer Motion**: Animations and transitions
- **Fuse.js**: Fuzzy search for stations
- **Lucide React**: Icon library
- **Axios & SWR**: Data fetching and caching

### Key Algorithms
- Time-expanded graph representation for chronological validity
- Modified Dijkstra's algorithm with multi-criteria optimization
- Closeness centrality computation for station importance
- Loop prevention and path validation

## Project Structure

```
hawkins-crew/
├── app.py                      # Flask server with in-memory graph
├── advanced_route_finder.py   # Multi-criteria route optimization engine
├── build_graph.py              # Graph construction from railway data
├── mongodb.py                  # Database connection utilities
├── main.py                     # Entry point
├── graph.pkl                   # Pre-built railway network graph
├── stations.json               # Station data (GeoJSON format)
├── trains.json                 # Train information (GeoJSON format)
├── schedules.json              # Train schedules and timing data
├── requirements.txt            # Python dependencies
├── pyproject.toml              # Project configuration
└── frontend/                   # Next.js frontend application
    ├── app/
    │   ├── page.tsx           # Main application page
    │   ├── layout.tsx         # Root layout
    │   └── api/               # API routes
    ├── contexts/
    │   └── StationsContext.tsx # Station data management
    ├── lib/
    │   ├── api.ts             # Backend API client
    │   └── db.ts              # Database utilities
    └── package.json           # Node dependencies
```

## Installation

### Prerequisites
- Python 3.14 or higher
- Node.js 20 or higher
- MongoDB (for persistent storage)

### Backend Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd hawkins-crew
```

2. Create and activate virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
# OR using uv
uv pip install -r requirements.txt
```

4. Set up environment variables:
```bash
# Create .env file with your MongoDB connection string
echo "MONGODB_URI=your_mongodb_connection_string" > .env
```

5. Build the graph (if not already built):
```bash
python build_graph.py
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
# Create .env.local with backend API URL
echo "NEXT_PUBLIC_API_URL=http://localhost:5000" > .env.local
```

## Usage

### Starting the Backend Server

```bash
# From project root
python app.py
```

The Flask server will start on `http://localhost:5000` with the graph loaded in memory for fast queries.

### Starting the Frontend Development Server

```bash
# From frontend directory
npm run dev
```

The Next.js application will start on `http://localhost:3000`.

### Building for Production

Backend:
```bash
# The Flask app runs with the pre-built graph.pkl
python app.py
```

Frontend:
```bash
cd frontend
npm run build
npm start
```

## API Endpoints

### GET /stations
Returns list of all railway stations with details:
- Station code, name, state, zone
- Geographic coordinates
- Address information

### POST /find-routes
Find optimal routes between two stations.

**Request Body:**
```json
{
  "origin": "NDLS",        // Station code
  "destination": "MAQ",     // Station code
  "max_routes": 5          // Optional, default: 3
}
```

**Response:**
```json
{
  "routes": [
    {
      "segments": [...],
      "total_duration": 3600,
      "total_waiting": 1800,
      "num_transfers": 1,
      "score": 5400.0,
      "stations_visited": ["NDLS", "BPL", "MAQ"],
      "trains_used": ["12137", "12919"]
    }
  ]
}
```

## Key Components

### Advanced Route Finder
- Implements multi-criteria optimization with configurable weights
- Uses time-expanded graph for chronological validity
- Computes station centrality for connectivity scoring
- Prevents loops and validates transfer feasibility

### Graph Construction
- Processes raw railway data (stations, trains, schedules)
- Builds time-expanded graph with proper transfer edges
- Maintains chronological ordering of connections
- Optimized for fast route queries

### Frontend Features
- Interactive station search with fuzzy matching
- Real-time route visualization
- Responsive design for mobile and desktop
- Smooth animations and transitions

## Team

**Hawkins Crew**
- Rohith Anumalasetty - [@nxtrohith](https://github.com/nxtrohith)
- Vaishali Ragi - [@vaishaliragi66-rgb](https://github.com/vaishaliragi66-rgb)
- Anudeep Reddy Veerati - [@AnudeepReddyVeerati](https://github.com/AnudeepReddyVeerati)

## Domain

Digital Governance & Public Services

## Impact

RailConnect supports Digital India's vision by:
- Improving access to underserved destinations
- Reducing travel uncertainty for passengers
- Enhancing utilization of existing railway infrastructure
- Providing citizen-centric digital services
- Making railway travel more accessible and reliable for millions

## License

This project was developed for the Digital India Hackathon 2026.

## Acknowledgments

- Indian Railways for the comprehensive railway network data
- Digital India Hackathon 2026 organizers
- Open source community for the excellent tools and libraries

---

**Note**: See [ORIGINAL_SUBMISSION.md](./ORIGINAL_SUBMISSION.md) for the immutable hackathon submission record.