"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import Fuse from "fuse.js";

export interface Station {
  code: string;
  name: string;
  state: string | null;
  zone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface StationsContextType {
  stations: Station[];
  fuse: Fuse<Station> | null;
  loading: boolean;
  error: string | null;
  search: (query: string) => Station[];
}

const StationsContext = createContext<StationsContextType>({
  stations: [],
  fuse: null,
  loading: true,
  error: null,
  search: () => [],
});

/** Parse the GeoJSON stations.json into flat Station objects */
function parseGeoJSON(geojson: any): Station[] {
  const results: Station[] = [];
  for (const feat of geojson.features ?? []) {
    const props = feat.properties ?? {};
    const code: string = props.code ?? "";
    const name: string = props.name ?? "";

    // Skip placeholder/internal entries
    if (
      !code ||
      !name ||
      code.startsWith("XX-") ||
      code.startsWith("YY-") ||
      name === code
    ) {
      continue;
    }

    const coords = feat.geometry?.coordinates ?? [null, null];
    results.push({
      code,
      name,
      state: props.state ?? null,
      zone: props.zone ?? null,
      address: props.address ?? null,
      longitude: coords[0] ?? null,
      latitude: coords[1] ?? null,
    });
  }
  // Sort alphabetically by name
  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
}

export function StationsProvider({ children }: { children: ReactNode }) {
  const [stations, setStations] = useState<Station[]>([]);
  const [fuse, setFuse] = useState<Fuse<Station> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load directly from /stations.json in the public folder — no backend needed
    fetch("/stations.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((geojson) => {
        const parsed = parseGeoJSON(geojson);
        setStations(parsed);

        const fuseInstance = new Fuse(parsed, {
          keys: [
            { name: "name", weight: 0.6 },
            { name: "code", weight: 0.4 },
          ],
          threshold: 0.35,
          includeScore: true,
          minMatchCharLength: 1,
        });
        setFuse(fuseInstance);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load stations.json:", err);
        setError("Failed to load station data.");
        setLoading(false);
      });
  }, []);

  const search = (query: string): Station[] => {
    if (!query.trim()) return stations.slice(0, 30);
    if (!fuse) return [];
    return fuse.search(query, { limit: 30 }).map((r) => r.item);
  };

  return (
    <StationsContext.Provider value={{ stations, fuse, loading, error, search }}>
      {children}
    </StationsContext.Provider>
  );
}

export function useStations() {
  return useContext(StationsContext);
}
