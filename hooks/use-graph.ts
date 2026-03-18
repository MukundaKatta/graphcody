"use client";

import useSWR from "swr";
import { graphApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";

export function useGraph(repoId: string | null) {
  const { setGraphData } = useAppStore();

  const { data, error, isLoading, mutate } = useSWR(
    repoId ? `graph-${repoId}` : null,
    async () => {
      const graphData = await graphApi.getGraph(repoId!);
      setGraphData(graphData);
      return graphData;
    }
  );

  return { graphData: data, error, isLoading, refresh: mutate };
}

export function useNodeNeighbors(nodeId: string | null, depth = 1) {
  const { data, error, isLoading } = useSWR(
    nodeId ? `neighbors-${nodeId}-${depth}` : null,
    () => graphApi.getNeighbors(nodeId!, depth)
  );

  return { neighbors: data, error, isLoading };
}

export function useCallChain(nodeId: string | null) {
  const { data, error, isLoading } = useSWR(
    nodeId ? `callchain-${nodeId}` : null,
    () => graphApi.getCallChain(nodeId!)
  );

  return { callChain: data, error, isLoading };
}
