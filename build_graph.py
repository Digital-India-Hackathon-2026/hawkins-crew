"""
Railway Journey Planning System - Graph Builder

Builds time-expanded railway graph from schedules, stations, and trains data.
Saves graph to graph.pkl for use by routing algorithms.
"""

import bisect
import json
import pickle
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Tuple

import networkx as nx
import pandas as pd
from tqdm import tqdm


MINIMUM_TRANSFER_TIME = 600  # seconds
MAX_TRANSFER_TIME = 4 * 3600  # seconds
SECONDS_PER_DAY = 86400


def load_data() -> Tuple[List[Dict], Dict[str, Dict], Dict[str, Dict]]:
    """Load schedules, stations, and trains from JSON files."""
    print("Loading data...")

    with open("schedules.json", "r") as f:
        schedules = json.load(f)

    with open("stations.json", "r") as f:
        stations_geojson = json.load(f)
        stations = {}
        for feat in stations_geojson["features"]:
            code = feat["properties"]["code"]
            geom = feat.get("geometry")

            coords = None
            if geom and geom.get("coordinates"):
                coords = geom["coordinates"]

            stations[code] = {
                "station_code": code,
                "station_name": feat["properties"]["name"],
                "latitude": coords[1] if coords else None,
                "longitude": coords[0] if coords else None,
                "zone": feat["properties"]["zone"],
                "state": feat["properties"]["state"],
            }

    with open("trains.json", "r") as f:
        trains_geojson = json.load(f)
        trains = {
            feat["properties"]["number"]: {
                "number": feat["properties"]["number"],
                "name": feat["properties"]["name"],
                "type": feat["properties"]["type"],
                "zone": feat["properties"]["zone"],
                "distance": feat["properties"]["distance"],
                "duration_h": feat["properties"]["duration_h"],
                "duration_m": feat["properties"]["duration_m"],
            }
            for feat in trains_geojson["features"]
        }

    return schedules, stations, trains


def time_to_seconds(time_str: str) -> int:
    """Convert HH:MM:SS to seconds since midnight, return None if missing."""
    if time_str in (None, "None", ""):
        return None
    h, m, s = map(int, time_str.split(":"))
    return h * 3600 + m * 60 + s


def prepare_schedule(schedules: List[Dict]) -> pd.DataFrame:
    """Prepare schedule dataframe with time computations and stop sequences."""
    print("Preparing schedules...")

    df = pd.DataFrame(schedules)

    # Default day to 1 if missing
    df["day"] = df["day"].fillna(1).astype(int)

    # Compute seconds from midnight
    df["arrival_seconds"] = df["arrival"].apply(time_to_seconds)
    df["departure_seconds"] = df["departure"].apply(time_to_seconds)

    # Compute sort keys with day offset, preserving None
    df["arrival_sort_key"] = df.apply(
        lambda row: None if row["arrival_seconds"] is None
                   else row["arrival_seconds"] + (row["day"] - 1) * SECONDS_PER_DAY,
        axis=1
    )
    df["departure_sort_key"] = df.apply(
        lambda row: None if row["departure_seconds"] is None
                   else row["departure_seconds"] + (row["day"] - 1) * SECONDS_PER_DAY,
        axis=1
    )

    # Sort chronologically by train and departure/arrival
    df["temp_sort"] = df.apply(
        lambda row: row["departure_sort_key"] if row["departure_sort_key"] is not None
                   else row["arrival_sort_key"],
        axis=1
    )
    df = df.sort_values(["train_number", "temp_sort"]).reset_index(drop=True)

    # Assign stop_sequence per train
    df["stop_sequence"] = df.groupby("train_number").cumcount() + 1

    return df


def create_nodes(G: nx.MultiDiGraph, df: pd.DataFrame) -> Dict[str, List[Tuple[str, int, int]]]:
    """Create time-expanded nodes and build station index."""
    print("Creating nodes...")

    station_index = defaultdict(list)

    for row in tqdm(df.itertuples(), total=len(df), desc="Nodes"):
        node_id = f"{row.train_number}_{row.stop_sequence}"

        G.add_node(
            node_id,
            station=row.station_code,
            train=row.train_number,
            arrival=row.arrival,
            departure=row.departure,
            arrival_seconds=row.arrival_seconds,
            departure_seconds=row.departure_seconds,
            arrival_sort_key=row.arrival_sort_key,
            departure_sort_key=row.departure_sort_key,
            day=row.day,
            stop_sequence=row.stop_sequence,
        )

        # Store (node_id, arrival_sort_key, departure_sort_key, train) for transfer logic
        station_index[row.station_code].append(
            (node_id, row.arrival_sort_key, row.departure_sort_key, row.train_number)
        )

    return dict(station_index)


def create_travel_edges(G: nx.MultiDiGraph, df: pd.DataFrame) -> Tuple[int, List[str]]:
    """Create travel edges between consecutive stops on same train."""
    print("Creating travel edges...")

    edge_count = 0
    warnings = []

    for train_number, group in tqdm(df.groupby("train_number"), desc="Travel edges"):
        stops = group.sort_values("stop_sequence").itertuples()
        prev_stop = None

        for stop in stops:
            if prev_stop is not None:
                current_node = f"{prev_stop.train_number}_{prev_stop.stop_sequence}"
                next_node = f"{stop.train_number}_{stop.stop_sequence}"

                # Validate that both times exist for travel edge
                if prev_stop.departure_sort_key is None:
                    raise ValueError(
                        f"Train {train_number}: Missing departure time at stop {prev_stop.stop_sequence} "
                        f"({prev_stop.station_code}). Cannot create travel edge to next stop."
                    )
                if stop.arrival_sort_key is None:
                    raise ValueError(
                        f"Train {train_number}: Missing arrival time at stop {stop.stop_sequence} "
                        f"({stop.station_code}). Cannot create travel edge from previous stop."
                    )

                # Travel time = next arrival - current departure
                travel_time = stop.arrival_sort_key - prev_stop.departure_sort_key

                if travel_time <= 0:
                    # Skip invalid edge, log warning
                    warnings.append(
                        f"Train {train_number}: Skipped edge stop {prev_stop.stop_sequence} "
                        f"({prev_stop.station_code}) -> {stop.stop_sequence} ({stop.station_code}), "
                        f"travel_time={travel_time}s"
                    )
                    continue

                G.add_edge(
                    current_node,
                    next_node,
                    edge_type="travel",
                    weight=travel_time,
                )
                edge_count += 1

            prev_stop = stop

    return edge_count, warnings


def create_transfer_edges(G: nx.MultiDiGraph, station_index: Dict[str, List[Tuple[str, int, int, str]]]) -> int:
    """
    Create transfer edges at each station using binary search with smart pruning.

    Pruning strategy:
    - For each arriving train, create transfer edges only to the NEXT available departure
      on each distinct departing train within the transfer window.
    - Skip later departures on the same train (passengers prefer earliest connection).
    - This preserves routing correctness: shortest path algorithms will find optimal routes
      through the earliest feasible connections on each train.
    - Reduces edge count dramatically at busy stations while maintaining connectivity.
    """
    print("Creating transfer edges...")

    edge_count = 0

    for station_code, nodes_data in tqdm(station_index.items(), desc="Transfer edges"):
        # Split into arrivals and departures
        arrivals = []
        departures = []

        for node_id, arrival_sk, departure_sk, train_num in nodes_data:
            arrival_str = G.nodes[node_id]["arrival"]
            departure_str = G.nodes[node_id]["departure"]

            if arrival_str != "None" and arrival_sk is not None:
                arrivals.append((node_id, arrival_sk, train_num))
            if departure_str != "None" and departure_sk is not None:
                departures.append((node_id, departure_sk, train_num))

        # Sort departures by departure_sort_key
        departures.sort(key=lambda x: x[1])
        departure_times = [d[1] for d in departures]

        # For each arrival, find valid departures
        for arrival_node, arrival_time, arrival_train in arrivals:
            min_departure_time = arrival_time + MINIMUM_TRANSFER_TIME
            max_departure_time = arrival_time + MAX_TRANSFER_TIME

            # Binary search for first valid departure
            idx = bisect.bisect_left(departure_times, min_departure_time)

            # Track which departing trains we've already connected to
            # Only create edge to first feasible departure on each train
            connected_trains = set()

            # Scan departures within transfer window
            for i in range(idx, len(departures)):
                departure_node, departure_time, departure_train = departures[i]

                # Stop if beyond maximum transfer window
                if departure_time > max_departure_time:
                    break

                # Skip same train transfers
                if arrival_train == departure_train:
                    continue

                # Skip if we've already connected to an earlier departure on this train
                if departure_train in connected_trains:
                    continue

                waiting_time = departure_time - arrival_time

                G.add_edge(
                    arrival_node,
                    departure_node,
                    edge_type="transfer",
                    weight=waiting_time,
                )
                edge_count += 1

                # Mark this train as connected
                connected_trains.add(departure_train)

    return edge_count


def validate_graph(G: nx.MultiDiGraph, travel_count: int, transfer_count: int) -> None:
    """Validate graph structure and edge weights."""
    print("Validating graph...")

    node_ids = list(G.nodes())
    if len(node_ids) != len(set(node_ids)):
        raise ValueError("Duplicate node IDs detected")

    travel_valid = 0
    transfer_valid = 0

    for u, v, data in G.edges(data=True):
        if u not in G.nodes:
            raise ValueError(f"Edge references missing source node: {u}")
        if v not in G.nodes:
            raise ValueError(f"Edge references missing target node: {v}")

        u_node = G.nodes[u]
        v_node = G.nodes[v]

        if data["edge_type"] == "travel":
            # Validate weight
            if data["weight"] <= 0:
                raise ValueError(f"Travel edge {u} -> {v} has invalid weight: {data['weight']}")

            # Validate same train
            if u_node["train"] != v_node["train"]:
                raise ValueError(
                    f"Travel edge {u} -> {v} connects different trains: "
                    f"{u_node['train']} and {v_node['train']}"
                )

            # Validate increasing stop sequences (allow gaps from skipped edges)
            if v_node["stop_sequence"] <= u_node["stop_sequence"]:
                raise ValueError(
                    f"Travel edge {u} -> {v} has invalid stop sequence order: "
                    f"sequence {u_node['stop_sequence']} -> {v_node['stop_sequence']}"
                )

            travel_valid += 1

        elif data["edge_type"] == "transfer":
            # Validate weight
            if data["weight"] < MINIMUM_TRANSFER_TIME:
                raise ValueError(
                    f"Transfer edge {u} -> {v} below minimum transfer time: {data['weight']}"
                )

            # Validate same station
            if u_node["station"] != v_node["station"]:
                raise ValueError(
                    f"Transfer edge {u} -> {v} connects different stations: "
                    f"{u_node['station']} and {v_node['station']}"
                )

            transfer_valid += 1

    if travel_valid != travel_count:
        raise ValueError(f"Travel edge count mismatch: expected {travel_count}, found {travel_valid}")
    if transfer_valid != transfer_count:
        raise ValueError(f"Transfer edge count mismatch: expected {transfer_count}, found {transfer_valid}")

    print("Validation passed.")


def save_graph(
    G: nx.MultiDiGraph,
    stations: Dict[str, Dict],
    trains: Dict[str, Dict],
    travel_count: int,
    transfer_count: int,
) -> None:
    """Save graph with metadata to pickle file."""
    print("Saving graph...")

    G.graph["stations"] = stations
    G.graph["trains"] = trains
    G.graph["minimum_transfer_time"] = MINIMUM_TRANSFER_TIME
    G.graph["graph_version"] = "1.0"
    G.graph["creation_timestamp"] = datetime.now().isoformat()
    G.graph["build_info"] = {
        "builder": "build_graph.py",
        "networkx_version": nx.__version__,
        "minimum_transfer_time": MINIMUM_TRANSFER_TIME,
        "maximum_transfer_time": MAX_TRANSFER_TIME,
    }
    G.graph["dataset_statistics"] = {
        "total_nodes": G.number_of_nodes(),
        "travel_edges": travel_count,
        "transfer_edges": transfer_count,
        "total_edges": G.number_of_edges(),
    }

    with open("graph.pkl", "wb") as f:
        pickle.dump(G, f)

    print("Done.")


def main() -> None:
    """Main execution."""
    schedules, stations, trains = load_data()
    df = prepare_schedule(schedules)

    G = nx.MultiDiGraph()

    station_index = create_nodes(G, df)
    travel_edge_count, travel_warnings = create_travel_edges(G, df)
    transfer_edge_count = create_transfer_edges(G, station_index)

    if travel_warnings:
        print(f"\nWarning: Skipped {len(travel_warnings)} invalid travel edges")
        if len(travel_warnings) <= 10:
            for w in travel_warnings:
                print(f"  {w}")
        else:
            for w in travel_warnings[:5]:
                print(f"  {w}")
            print(f"  ... and {len(travel_warnings) - 5} more")

    validate_graph(G, travel_edge_count, transfer_edge_count)
    save_graph(G, stations, trains, travel_edge_count, transfer_edge_count)

    print(f"\nNodes: {G.number_of_nodes()}")
    print(f"Travel edges: {travel_edge_count}")
    print(f"Transfer edges: {transfer_edge_count}")
    print(f"Total edges: {G.number_of_edges()}")
    print(f"\nGraph saved to graph.pkl")


if __name__ == "__main__":
    main()
