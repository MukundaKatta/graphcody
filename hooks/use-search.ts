"use client";

import { useState, useCallback } from "react";
import { searchApi } from "@/lib/api";
import type { SearchResult, SearchFilters } from "@/types";

export function useSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (filters: SearchFilters) => {
    if (!filters.query.trim()) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const res = await searchApi.semantic(filters);
      setResults(res.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const crossRepoSearch = useCallback(async (filters: SearchFilters) => {
    setIsSearching(true);
    setError(null);

    try {
      const res = await searchApi.crossRepo(filters);
      setResults(res.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cross-repo search failed");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  return { results, isSearching, error, search, crossRepoSearch, setResults };
}
