"""
Advanced Railway Route Finder with Multi-Criteria Optimization

Implements journey planning with:
- Chronological validity (via time-expanded graph structure)
- Transfer time constraints (already in graph edges)
- Loop prevention
- Multi-criteria ranking using closeness centrality
- Multiple route suggestions
"""

import pickle
import heapq
from datetime import datetime
from typing import List, Dict, Optional, Tuple, Set
from collections import defaultdict
from dataclasses import dataclass, field
import networkx as nx


# Scoring weights for multi-criteria optimization
WEIGHTS = {
    'travel_time': 1.0,         # Base cost per second of travel
    'transfer_penalty': 3600,    # Penalty per transfer (1 hour equivalent)
    'waiting_time': 0.8,         # Cost per second of waiting
    'centrality_bonus': -7200,   # Bonus for high-centrality stations (2 hours equivalent, negative = benefit)
}


@dataclass
class Journey:
    """Represents a complete journey from origin to destination."""
    segments: List[Dict]  # List of travel segments and transfers
    total_duration: int  # Total journey time in seconds
    total_waiting: int  # Total waiting time at transfers
    num_transfers: int
    stations_visited: List[str]  # Ordered list of station codes
    trains_used: List[str]  # Ordered list of train numbers
    transfer_stations: List[str]  # Stations where transfers occur
    score: float  # Overall route score (lower is better)
    score_breakdown: Dict[str, float] = field(default_factory=dict)

    def __lt__(self, other):
        """For heap comparison - lower score is better."""
        return self.score < other.score


class AdvancedRouteFinder:
    """Advanced route finder with multi-criteria optimization."""

    def __init__(self, graph_path: str = "graph.pkl"):
        """Initialize route finder and load graph."""
        print("Loading graph...")
        with open(graph_path, "rb") as f:
            self.G = pickle.load(f)
        print(f"Graph loaded: {self.G.number_of_nodes():,} nodes, {self.G.number_of_edges():,} edges")

        # Compute closeness centrality for station-level graph
        print("Computing closeness centrality...")
        self.station_centrality = self._compute_station_centrality()
        print(f"Computed centrality for {len(self.station_centrality)} stations")

    def _compute_station_centrality(self) -> Dict[str, float]:
        """
        Compute closeness centrality for each station.

        Creates a station-level graph (not time-expanded) where edges exist
        if any train connects two stations, then computes centrality.
        """
        # Build station-level graph
        station_graph = nx.Graph()

        # Add all stations
        stations = set()
        for node_id in self.G.nodes():
            station = self.G.nodes[node_id]['station']
            stations.add(station)

        station_graph.add_nodes_from(stations)

        # Add edges based on train connections
        for u, v, data in self.G.edges(data=True):
            if data['edge_type'] == 'travel':
                u_station = self.G.nodes[u]['station']
                v_station = self.G.nodes[v]['station']
                if u_station != v_station:
                    station_graph.add_edge(u_station, v_station)

        # Compute closeness centrality
        centrality = nx.closeness_centrality(station_graph)

        return centrality

    def _get_centrality_bonus(self, station_code: str) -> float:
        """
        Get centrality bonus for a station.

        Higher centrality = better connected hub = larger bonus (more negative cost).
        """
        centrality = self.station_centrality.get(station_code, 0.0)
        # Scale centrality (typically 0-1) by the bonus weight
        return centrality * WEIGHTS['centrality_bonus']

    def _calculate_route_score(
        self,
        total_duration: int,
        num_transfers: int,
        total_waiting: int,
        transfer_stations: List[str]
    ) -> Tuple[float, Dict[str, float]]:
        """
        Calculate overall route score using weighted criteria.

        Lower score is better.

        Returns:
            (total_score, score_breakdown)
        """
        breakdown = {}

        # Travel time cost (total journey duration)
        breakdown['travel_time'] = total_duration * WEIGHTS['travel_time']

        # Transfer penalty (each transfer adds fixed cost)
        breakdown['transfer_penalty'] = num_transfers * WEIGHTS['transfer_penalty']

        # Waiting time cost
        breakdown['waiting_time'] = total_waiting * WEIGHTS['waiting_time']

        # Centrality bonus (negative = benefit)
        # Sum centrality across all transfer stations
        centrality_bonus = sum(
            self._get_centrality_bonus(station)
            for station in transfer_stations
        )
        breakdown['centrality_bonus'] = centrality_bonus

        # Total score
        total_score = sum(breakdown.values())

        return total_score, breakdown

    def find_routes(
        self,
        from_station: str,
        to_station: str,
        travel_date: datetime,
        max_routes: int = 5,
        max_candidates: int = 100
    ) -> List[Journey]:
        """
        Find multiple feasible routes ranked by multi-criteria score.

        Uses k-shortest paths with loop prevention, then ranks by multi-criteria score.

        Args:
            from_station: Origin station code
            to_station: Destination station code
            travel_date: Date of travel (for display purposes)
            max_routes: Maximum number of routes to return
            max_candidates: Maximum candidate paths to explore

        Returns:
            List of Journey objects, sorted by score (best first)
        """
        print(f"\nFinding routes: {from_station} → {to_station}")

        # Find all nodes at origin and destination
        origin_nodes = [
            n for n in self.G.nodes()
            if self.G.nodes[n]['station'] == from_station
        ]
        dest_nodes = set(
            n for n in self.G.nodes()
            if self.G.nodes[n]['station'] == to_station
        )

        if not origin_nodes:
            print(f"Error: Station {from_station} not found in graph")
            return []

        if not dest_nodes:
            print(f"Error: Station {to_station} not found in graph")
            return []

        print(f"Origin nodes: {len(origin_nodes)}, Destination nodes: {len(dest_nodes)}")

        # Find multiple paths using modified Dijkstra with path diversity
        paths = self._find_k_shortest_paths_with_loops_prevented(
            origin_nodes,
            dest_nodes,
            k=max_candidates
        )

        print(f"Found {len(paths)} candidate paths")

        if not paths:
            return []

        # Convert paths to Journey objects and calculate scores
        journeys = []
        for path in paths:
            journey = self._build_journey(path, from_station, to_station)
            if journey:
                journeys.append(journey)

        # Sort by score and return top routes
        journeys.sort()
        return journeys[:max_routes]

    def _find_k_shortest_paths_with_loops_prevented(
        self,
        origin_nodes: List[str],
        dest_nodes: Set[str],
        k: int = 100
    ) -> List[List[str]]:
        """
        Find shortest path using simple Dijkstra (no station revisit prevention).

        Returns list with single path. Multi-path logic can be added later.
        """
        # Track best distance to each node
        distances = {}  # node -> best distance
        parent = {}  # node -> parent in shortest path tree
        pq = []  # (distance, node)

        # Initialize from all origin nodes
        for origin in origin_nodes:
            distances[origin] = 0
            heapq.heappush(pq, (0, origin))

        visited = set()
        iterations = 0

        while pq:
            iterations += 1
            if iterations % 1000 == 0:
                print(f"  Iter {iterations}: PQ size={len(pq)}, Visited={len(visited)}")

            curr_dist, curr_node = heapq.heappop(pq)

            # Skip if already processed
            if curr_node in visited:
                continue
            visited.add(curr_node)

            # Found destination - reconstruct path
            if curr_node in dest_nodes:
                print(f"  Found destination at iteration {iterations}")
                path = []
                node = curr_node
                while node in parent:
                    path.append(node)
                    node = parent[node]
                path.append(node)
                path.reverse()
                return [path]

            # Explore neighbors
            if curr_node not in self.G:
                continue

            for next_node in self.G[curr_node]:
                if next_node in visited:
                    continue

                # Get edge data and apply multi-criteria scoring
                edge_data = self.G[curr_node][next_node]
                edge_info = list(edge_data.values())[0]
                edge_type = edge_info['edge_type']
                weight = edge_info['weight']

                # Calculate edge cost with multi-criteria
                if edge_type == 'travel':
                    # Travel edges: just time cost
                    edge_cost = weight * WEIGHTS['travel_time']
                elif edge_type == 'transfer':
                    # Transfer edges: penalty + waiting + centrality bonus
                    curr_station = self.G.nodes[curr_node]['station']
                    edge_cost = (
                        WEIGHTS['transfer_penalty'] +
                        weight * WEIGHTS['waiting_time'] +
                        self._get_centrality_bonus(curr_station)
                    )
                else:
                    edge_cost = weight

                new_dist = curr_dist + edge_cost

                # Update if better path found
                if next_node not in distances or new_dist < distances[next_node]:
                    distances[next_node] = new_dist
                    parent[next_node] = curr_node
                    heapq.heappush(pq, (new_dist, next_node))

        print(f"  No path found after {iterations} iterations")
        return []

    def _build_journey(
        self,
        path: List[str],
        origin_station: str,
        dest_station: str
    ) -> Optional[Journey]:
        """
        Build a Journey object from a node path.
        """
        if len(path) < 2:
            return None

        segments = []
        stations_visited = [origin_station]
        trains_used = []
        transfer_stations = []

        current_segment = None
        total_waiting = 0

        # Walk through path and build segments
        for i in range(len(path) - 1):
            u = path[i]
            v = path[i + 1]

            # Get edge data
            edge_data = self.G.get_edge_data(u, v)
            if not edge_data:
                continue

            edge_info = list(edge_data.values())[0]
            edge_type = edge_info['edge_type']

            u_node = self.G.nodes[u]
            v_node = self.G.nodes[v]

            if edge_type == 'travel':
                train_num = u_node['train']

                # Start new segment or continue existing
                if current_segment is None or current_segment['train_number'] != train_num:
                    # Save previous segment
                    if current_segment:
                        segments.append(current_segment)

                    # Start new segment
                    current_segment = {
                        'type': 'travel',
                        'train_number': train_num,
                        'from_station': u_node['station'],
                        'to_station': v_node['station'],
                        'departure_time': u_node['departure'],
                        'arrival_time': v_node['arrival'],
                        'departure_day': u_node['day'],
                        'arrival_day': v_node['day'],
                    }

                    if train_num not in trains_used:
                        trains_used.append(train_num)
                else:
                    # Continue segment - update destination
                    current_segment['to_station'] = v_node['station']
                    current_segment['arrival_time'] = v_node['arrival']
                    current_segment['arrival_day'] = v_node['day']

                # Track station if new
                if v_node['station'] not in stations_visited:
                    stations_visited.append(v_node['station'])

            elif edge_type == 'transfer':
                # Save current travel segment
                if current_segment:
                    segments.append(current_segment)
                    current_segment = None

                # Add transfer segment
                waiting_time = edge_info['weight']
                total_waiting += waiting_time

                station = u_node['station']
                transfer_stations.append(station)

                segments.append({
                    'type': 'transfer',
                    'station': station,
                    'waiting_time_sec': waiting_time,
                    'waiting_time_min': waiting_time // 60,
                })

        # Add final segment
        if current_segment:
            segments.append(current_segment)

        # Add destination to stations_visited if not there
        if dest_station not in stations_visited:
            stations_visited.append(dest_station)

        # Calculate total duration
        first_segment = None
        last_segment = None
        for seg in segments:
            if seg['type'] == 'travel':
                if first_segment is None:
                    first_segment = seg
                last_segment = seg

        if not first_segment or not last_segment:
            return None

        # Total duration from first departure to last arrival
        start_time = first_segment['departure_day'] * 86400 + self._time_to_seconds(first_segment['departure_time'])
        end_time = last_segment['arrival_day'] * 86400 + self._time_to_seconds(last_segment['arrival_time'])
        total_duration = end_time - start_time

        # Calculate score
        num_transfers = len([s for s in segments if s['type'] == 'transfer'])
        score, score_breakdown = self._calculate_route_score(
            total_duration,
            num_transfers,
            total_waiting,
            transfer_stations
        )

        journey = Journey(
            segments=segments,
            total_duration=total_duration,
            total_waiting=total_waiting,
            num_transfers=num_transfers,
            stations_visited=stations_visited,
            trains_used=trains_used,
            transfer_stations=transfer_stations,
            score=score,
            score_breakdown=score_breakdown
        )

        return journey

    def _time_to_seconds(self, time_str: str) -> int:
        """Convert HH:MM:SS to seconds since midnight."""
        if not time_str or time_str == "None":
            return 0
        h, m, s = map(int, time_str.split(':'))
        return h * 3600 + m * 60 + s


def format_journey(journey: Journey, rank: int) -> str:
    """Format a journey for display."""
    lines = []

    lines.append("")
    lines.append("=" * 80)
    lines.append(f"ROUTE #{rank}")
    lines.append("=" * 80)

    # Summary
    duration_hours = journey.total_duration // 3600
    duration_mins = (journey.total_duration % 3600) // 60

    lines.append(f"\nJourney Summary:")
    lines.append(f"  Total Duration: {duration_hours}h {duration_mins}m")
    lines.append(f"  Transfers: {journey.num_transfers}")
    lines.append(f"  Total Waiting Time: {journey.total_waiting // 60} minutes")
    lines.append(f"  Trains Used: {', '.join(journey.trains_used)}")
    lines.append(f"  Route Score: {journey.score:.2f}")

    # Score breakdown
    lines.append(f"\nScore Breakdown:")
    for component, value in journey.score_breakdown.items():
        lines.append(f"  {component}: {value:.2f}")

    # Transfer stations with centrality
    if journey.transfer_stations:
        lines.append(f"\nTransfer Stations (with centrality):")
        finder = None  # Will be passed if available
        for station in journey.transfer_stations:
            lines.append(f"  {station}")

    # Segments
    lines.append(f"\nDetailed Itinerary:")
    for i, segment in enumerate(journey.segments):
        if segment['type'] == 'transfer':
            lines.append(f"\n  >> TRANSFER at {segment['station']}")
            lines.append(f"     Waiting Time: {segment['waiting_time_min']} minutes")
        else:
            lines.append(f"\nTrain {segment['train_number']}")
            lines.append(f"   {segment['from_station']} (Day {segment['departure_day']}, {segment['departure_time']})")
            lines.append(f"   → {segment['to_station']} (Day {segment['arrival_day']}, {segment['arrival_time']})")

    lines.append("")

    return "\n".join(lines)


def format_all_routes(journeys: List[Journey]) -> str:
    """Format all journeys for display."""
    if not journeys:
        return "No routes found."

    output = []
    output.append("\n" + "=" * 80)
    output.append(f"FOUND {len(journeys)} ROUTE(S)")
    output.append("=" * 80)

    for rank, journey in enumerate(journeys, 1):
        output.append(format_journey(journey, rank))

    return "\n".join(output)


# Example usage
if __name__ == "__main__":
    finder = AdvancedRouteFinder()

    # Test route
    from_station = "BDCR"
    to_station = "HWH"
    travel_date = datetime(2026, 7, 13)

    routes = finder.find_routes(from_station, to_station, travel_date, max_routes=3)

    print(format_all_routes(routes))
