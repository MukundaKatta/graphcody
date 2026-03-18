"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useGraph } from "@/hooks/use-graph";
import { useRepos } from "@/hooks/use-repos";
import { useAppStore } from "@/lib/store";
import { graphApi } from "@/lib/api";
import { CodeGraphVisualizer } from "@/components/graph/code-graph-visualizer";
import { NodeDetailPanel } from "@/components/graph/node-detail-panel";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import type { GraphData } from "@/types";

export default function GraphPage() {
  const searchParams = useSearchParams();
  const { repos } = useRepos();
  const { activeRepo, setActiveRepo, selectedNodeId, setSelectedNodeId, graphLayout, setGraphLayout } = useAppStore();

  const initialRepoId = searchParams.get("repo") || activeRepo?.id || "";
  const [repoId, setRepoId] = useState(initialRepoId);
  const [viewMode, setViewMode] = useState<"full" | "dependencies" | "calls">("full");
  const [graphData, setGraphData] = useState<GraphData | null>(null);

  const { graphData: fullGraph, isLoading } = useGraph(repoId || null);

  useEffect(() => {
    if (repoId && repos.length > 0) {
      const repo = repos.find((r) => r.id === repoId);
      if (repo) setActiveRepo(repo);
    }
  }, [repoId, repos, setActiveRepo]);

  useEffect(() => {
    if (fullGraph) setGraphData(fullGraph);
  }, [fullGraph]);

  const handleViewDependencies = async () => {
    if (!repoId) return;
    setViewMode("dependencies");
    const data = await graphApi.getDependencies(repoId);
    setGraphData(data);
  };

  const handleViewCallChain = async () => {
    if (!selectedNodeId) return;
    setViewMode("calls");
    const data = await graphApi.getCallChain(selectedNodeId);
    setGraphData(data);
  };

  const handleViewFull = () => {
    setViewMode("full");
    if (fullGraph) setGraphData(fullGraph);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Code Graph</h1>
          <p className="text-sm text-surface-700/60 mt-1">
            Interactive visualization of code dependencies and relationships
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select
          options={[
            { value: "", label: "Select Repository" },
            ...repos.filter((r) => r.status === "indexed").map((r) => ({
              value: r.id,
              label: `${r.owner}/${r.name}`,
            })),
          ]}
          value={repoId}
          onChange={(e) => {
            setRepoId(e.target.value);
            setSelectedNodeId(null);
            setViewMode("full");
          }}
        />

        <div className="flex gap-1 bg-surface-100 rounded-lg p-1">
          {[
            { id: "full" as const, label: "Full Graph" },
            { id: "dependencies" as const, label: "Dependencies" },
            { id: "calls" as const, label: "Call Chain" },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                if (mode.id === "full") handleViewFull();
                else if (mode.id === "dependencies") handleViewDependencies();
                else if (mode.id === "calls") handleViewCallChain();
              }}
              disabled={mode.id === "calls" && !selectedNodeId}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                viewMode === mode.id
                  ? "bg-white text-surface-800 shadow-sm"
                  : "text-surface-700/60 hover:text-surface-800 disabled:opacity-40"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <Select
          options={[
            { value: "force", label: "Force Layout" },
            { value: "tree", label: "Tree Layout" },
            { value: "radial", label: "Radial Layout" },
          ]}
          value={graphLayout}
          onChange={(e) => setGraphLayout(e.target.value as "force" | "tree" | "radial")}
        />

        {graphData && (
          <div className="flex gap-2 ml-auto">
            <Badge variant="info">{graphData.nodes.length} nodes</Badge>
            <Badge variant="default">{graphData.edges.length} edges</Badge>
          </div>
        )}
      </div>

      {/* Graph + Detail */}
      {!repoId ? (
        <EmptyState
          title="Select a repository"
          description="Choose an indexed repository to visualize its code graph."
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center h-[600px]">
          <Spinner size="lg" />
        </div>
      ) : graphData ? (
        <div className="flex gap-0 h-[calc(100vh-250px)]">
          <div className={`flex-1 ${selectedNodeId ? "mr-0" : ""}`}>
            <CodeGraphVisualizer
              data={graphData}
              onNodeClick={(id) => setSelectedNodeId(id)}
              selectedNodeId={selectedNodeId}
              layout={graphLayout}
            />
          </div>
          {selectedNodeId && repoId && (
            <NodeDetailPanel
              nodeId={selectedNodeId}
              repoId={repoId}
              onNavigate={(id) => setSelectedNodeId(id)}
              onClose={() => setSelectedNodeId(null)}
            />
          )}
        </div>
      ) : (
        <EmptyState
          title="No graph data"
          description="The repository may still be indexing. Check the repos page for status."
          action={<Button onClick={() => window.location.reload()}>Refresh</Button>}
        />
      )}
    </div>
  );
}
