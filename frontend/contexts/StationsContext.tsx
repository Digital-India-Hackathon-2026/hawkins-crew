"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import Fuse from "fuse.js";
import { Station, getAllStations } from "@/lib/api";

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

export function StationsProvider({ children }: { children: ReactNode }) {
  const [stations, setStations] = useState<Station[]>([]);
  const [fuse, setFuse] = useState<Fuse<Station> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAllStations()
      .then((data) => {
        setStations(data);
        const fuseInstance = new Fuse(data, {
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
        setError("Failed to load stations. Is the backend running?");
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
