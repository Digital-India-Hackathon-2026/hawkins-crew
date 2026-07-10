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
import math
import json
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

    def __init__(self, graph_path: str = "graph.pkl", trains_path: str = "trains.json", use_centrality: bool = False):
        """Initialize route finder and load graph."""
        print("Loading graph...")
        with open(graph_path, "rb") as f:
            self.G = pickle.load(f)
        print(f"Graph loaded: {self.G.number_of_nodes():,} nodes, {self.G.number_of_edges():,} edges")

        # Load train names mapping
        print("Loading train names...")
        self.train_names = {}
        try:
            with open(trains_path, "r", encoding="utf-8") as f:
                trains_data = json.load(f)
                if trains_data.get("type") == "FeatureCollection":
                    for feature in trains_data.get("features", []):
                        props = feature.get("properties", {})
                        train_number = props.get("number")
                        train_name = props.get("name")
                        if train_number and train_name:
                            self.train_names[train_number] = train_name
            print(f"Loaded {len(self.train_names)} train names")
        except Exception as e:
            print(f"Warning: Could not load train names: {e}")
            self.train_names = {}

        # Compute closeness centrality for station-level graph (optional, expensive)
        if use_centrality:
            print("Computing closeness centrality...")
            self.station_centrality = self._compute_station_centrality()
            print(f"Computed centrality for {len(self.station_centrality)} stations")
        else:
            self.station_centrality = {}
            print("Skipping centrality computation (use_centrality=False)")

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
        Find k-shortest paths using modified Yen's algorithm.

        Finds multiple diverse routes by exploring different paths through the network.
        Uses station-level diversity to ensure routes are meaningfully different.

        Args:
            origin_nodes: List of origin node IDs
            dest_nodes: Set of destination node IDs
            k: Maximum number of paths to find

        Returns:
            List of paths (each path is a list of node IDs)
        """
        print(f"  Finding up to {k} candidate paths...")

        # Find first shortest path
        first_path = self._dijkstra_shortest_path(origin_nodes, dest_nodes, set())
        if not first_path:
            print(f"  WARNING: First path not found!")
            return []

        paths = [first_path]
        print(f"  Found path 1 (length {len(first_path)} nodes)")

        # Use a priority queue to find alternative paths
        # Each candidate is (path_cost, path)
        candidates = []

        # For finding alternative paths, we'll use a modified approach:
        # Try to find paths that deviate from previous paths at different points
        for i in range(1, k):
            # Extract station-level path from previous paths to avoid too similar routes
            used_station_sequences = set()
            for path in paths:
                stations = tuple(self.G.nodes[node]['station'] for node in path)
                used_station_sequences.add(stations)

            # Try to find a path that uses different intermediate stations
            # We do this by temporarily blocking commonly used edges
            blocked_edges = self._identify_overused_edges(paths)

            # Find path with some edges blocked
            new_path = self._dijkstra_shortest_path(
                origin_nodes,
                dest_nodes,
                blocked_edges,
                max_iterations=5000
            )

            if not new_path:
                # If no path with blocked edges, try with different penalty approach
                new_path = self._dijkstra_with_penalty(
                    origin_nodes,
                    dest_nodes,
                    paths,
                    penalty_factor=0.5 + (i * 0.1)
                )

            if new_path:
                # Check if this path is meaningfully different
                new_stations = tuple(self.G.nodes[node]['station'] for node in new_path)

                # Calculate similarity with existing paths
                is_diverse = True
                for existing_stations in used_station_sequences:
                    # If > 80% of stations are the same, consider it too similar
                    common = sum(1 for s in new_stations if s in existing_stations)
                    similarity = common / max(len(new_stations), len(existing_stations))
                    if similarity > 0.8:
                        is_diverse = False
                        break

                if is_diverse:
                    paths.append(new_path)
                    print(f"  Found path {len(paths)} (length {len(new_path)} nodes)")

                    # Stop if we've found enough diverse paths
                    if len(paths) >= min(k, 10):  # Cap at 10 to avoid excessive computation
                        break

            # Stop trying if we've exhausted reasonable attempts
            if i > len(paths) * 5:  # Max 5 attempts per found path
                break

        print(f"  Total paths found: {len(paths)}")
        return paths

    def _dijkstra_shortest_path(
        self,
        origin_nodes: List[str],
        dest_nodes: Set[str],
        blocked_edges: Set[Tuple[str, str]],
        max_iterations: int = 500000
    ) -> Optional[List[str]]:
        """
        Find single shortest path using Dijkstra's algorithm.

        Args:
            origin_nodes: List of origin node IDs
            dest_nodes: Set of destination node IDs
            blocked_edges: Set of (from_node, to_node) tuples to avoid
            max_iterations: Maximum iterations to prevent infinite loops

        Returns:
            Path as list of node IDs, or None if no path found
        """
        distances = {}
        parent = {}
        pq = []

        for origin in origin_nodes:
            distances[origin] = 0
            heapq.heappush(pq, (0, origin))

        visited = set()
        iterations = 0
        debug_interval = max_iterations // 10

        while pq and iterations < max_iterations:
            iterations += 1

            if iterations % debug_interval == 0:
                print(f"    Dijkstra iter {iterations}: visited={len(visited)}, pq_size={len(pq)}")

            curr_dist, curr_node = heapq.heappop(pq)

            if curr_node in visited:
                continue
            visited.add(curr_node)

            # Found destination
            if curr_node in dest_nodes:
                path = []
                node = curr_node
                while node in parent:
                    path.append(node)
                    node = parent[node]
                path.append(node)
                path.reverse()
                return path

            # Explore neighbors
            if curr_node not in self.G:
                continue

            for next_node in self.G[curr_node]:
                if next_node in visited:
                    continue

                # Skip blocked edges
                if (curr_node, next_node) in blocked_edges:
                    continue

                # Get edge cost
                edge_data = self.G[curr_node][next_node]
                edge_info = list(edge_data.values())[0]
                edge_type = edge_info['edge_type']
                weight = edge_info['weight']

                # Skip edges with invalid weights
                if math.isnan(weight) or math.isinf(weight) or weight < 0:
                    continue

                # Calculate edge cost with multi-criteria
                if edge_type == 'travel':
                    edge_cost = weight * WEIGHTS['travel_time']
                elif edge_type == 'transfer':
                    curr_station = self.G.nodes[curr_node]['station']
                    edge_cost = (
                        WEIGHTS['transfer_penalty'] +
                        weight * WEIGHTS['waiting_time'] +
                        self._get_centrality_bonus(curr_station)
                    )
                else:
                    edge_cost = weight

                new_dist = curr_dist + edge_cost

                if next_node not in distances or new_dist < distances[next_node]:
                    distances[next_node] = new_dist
                    parent[next_node] = curr_node
                    heapq.heappush(pq, (new_dist, next_node))

        return None

    def _identify_overused_edges(self, paths: List[List[str]]) -> Set[Tuple[str, str]]:
        """
        Identify edges that appear in multiple paths.
        These will be temporarily blocked to encourage path diversity.

        Args:
            paths: List of paths found so far

        Returns:
            Set of (from_node, to_node) tuples to block
        """
        edge_usage = defaultdict(int)

        for path in paths:
            for i in range(len(path) - 1):
                edge = (path[i], path[i + 1])
                edge_usage[edge] += 1

        # Block edges used in most paths (but keep at least some options)
        threshold = max(1, len(paths) // 2)
        blocked = {edge for edge, count in edge_usage.items() if count >= threshold}

        # Limit blocking to avoid making problem unsolvable
        if len(blocked) > 50:
            # Only block the most frequently used edges
            sorted_edges = sorted(edge_usage.items(), key=lambda x: x[1], reverse=True)
            blocked = {edge for edge, _ in sorted_edges[:50]}

        return blocked

    def _dijkstra_with_penalty(
        self,
        origin_nodes: List[str],
        dest_nodes: Set[str],
        existing_paths: List[List[str]],
        penalty_factor: float = 0.5
    ) -> Optional[List[str]]:
        """
        Find path with penalty for using edges from existing paths.
        This encourages finding diverse routes.

        Args:
            origin_nodes: List of origin node IDs
            dest_nodes: Set of destination node IDs
            existing_paths: Paths already found
            penalty_factor: Multiplier for edge reuse penalty (0.5 = 50% increase)

        Returns:
            Path as list of node IDs, or None if no path found
        """
        # Count edge usage in existing paths
        edge_usage = defaultdict(int)
        for path in existing_paths:
            for i in range(len(path) - 1):
                edge_usage[(path[i], path[i + 1])] += 1

        distances = {}
        parent = {}
        pq = []

        for origin in origin_nodes:
            distances[origin] = 0
            heapq.heappush(pq, (0, origin))

        visited = set()
        iterations = 0
        max_iterations = 5000

        while pq and iterations < max_iterations:
            iterations += 1

            curr_dist, curr_node = heapq.heappop(pq)

            if curr_node in visited:
                continue
            visited.add(curr_node)

            if curr_node in dest_nodes:
                path = []
                node = curr_node
                while node in parent:
                    path.append(node)
                    node = parent[node]
                path.append(node)
                path.reverse()
                return path

            if curr_node not in self.G:
                continue

            for next_node in self.G[curr_node]:
                if next_node in visited:
                    continue

                edge_data = self.G[curr_node][next_node]
                edge_info = list(edge_data.values())[0]
                edge_type = edge_info['edge_type']
                weight = edge_info['weight']

                # Skip edges with invalid weights
                if math.isnan(weight) or math.isinf(weight) or weight < 0:
                    continue

                # Calculate base edge cost
                if edge_type == 'travel':
                    edge_cost = weight * WEIGHTS['travel_time']
                elif edge_type == 'transfer':
                    curr_station = self.G.nodes[curr_node]['station']
                    edge_cost = (
                        WEIGHTS['transfer_penalty'] +
                        weight * WEIGHTS['waiting_time'] +
                        self._get_centrality_bonus(curr_station)
                    )
                else:
                    edge_cost = weight

                # Apply penalty for reused edges
                edge_key = (curr_node, next_node)
                if edge_key in edge_usage:
                    usage_penalty = 1.0 + (penalty_factor * edge_usage[edge_key])
                    edge_cost *= usage_penalty

                new_dist = curr_dist + edge_cost

                if next_node not in distances or new_dist < distances[next_node]:
                    distances[next_node] = new_dist
                    parent[next_node] = curr_node
                    heapq.heappush(pq, (new_dist, next_node))

        return None

    def _get_station_name(self, station_code: str) -> str:
        """Get station name from graph metadata."""
        stations_metadata = self.G.graph.get('stations', {})
        station_info = stations_metadata.get(station_code, {})
        return station_info.get('station_name', '')

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
                        'train_name': self.train_names.get(train_num, ''),
                        'from_station': u_node['station'],
                        'from_station_name': self._get_station_name(u_node['station']),
                        'to_station': v_node['station'],
                        'to_station_name': self._get_station_name(v_node['station']),
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
                    current_segment['to_station_name'] = self._get_station_name(v_node['station'])
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
                    'station_name': self._get_station_name(station),
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
