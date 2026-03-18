"use client";

import { useState, useCallback } from "react";
import { useRepos } from "@/hooks/use-repos";
import { impactApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { getNodeKindColor } from "@/lib/utils";
import type { ImpactResult } from "@/types";

export default function ImpactPage() {
  const { repos } = useRepos();
  const { activeRepo } = useAppStore();

  const [repoId, setRepoId] = useState(activeRepo?.id || "");
  const [filePath, setFilePath] = useState("");
  const [result, setResult] = useState<ImpactResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = useCallback(async () => {
    if (!repoId || !filePath.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await impactApi.analyzeFile(repoId, filePath.trim());
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [repoId, filePath]);

  const getRiskColor = (score: number) => {
    if (score > 0.7) return "text-red-600";
    if (score > 0.4) return "text-yellow-600";
    return "text-green-600";
  };

  const getRiskBg = (score: number) => {
    if (score > 0.7) return "bg-red-100";
    if (score > 0.4) return "bg-yellow-100";
    return "bg-green-100";
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Impact Analysis</h1>
        <p className="text-sm text-surface-700/60 mt-1">
          Understand what breaks if you change a file or symbol
        </p>
      </div>

      {/* Input */}
      <Card>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="w-64">
              <Select
                label="Repository"
                options={[
                  { value: "", label: "Select Repository" },
                  ...repos.filter((r) => r.status === "indexed").map((r) => ({
                    value: r.id,
                    label: `${r.owner}/${r.name}`,
                  })),
                ]}
                value={repoId}
                onChange={(e) => setRepoId(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-surface-700 mb-1">File Path</label>
              <Input
                placeholder="e.g. src/services/auth.ts"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              />
            </div>
            <Button onClick={handleAnalyze} loading={loading} disabled={!repoId || !filePath.trim()}>
              Analyze Impact
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="text-sm text-surface-700/50 mt-4">Analyzing dependency graph...</p>
          </div>
        </div>
      ) : result ? (
        <div className="space-y-6">
          {/* Risk Score */}
          <Card>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className={`w-24 h-24 rounded-2xl ${getRiskBg(result.risk_score)} flex items-center justify-center`}>
                  <span className={`text-3xl font-bold ${getRiskColor(result.risk_score)}`}>
                    {Math.round(result.risk_score * 100)}%
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-surface-900">Risk Assessment</h3>
                  <p className="text-sm text-surface-700 mt-1">{result.summary}</p>
                  <div className="flex gap-2 mt-3">
                    <Badge variant="error">
                      {result.affected_nodes.filter((n) => n.risk === "high").length} high risk
                    </Badge>
                    <Badge variant="warning">
                      {result.affected_nodes.filter((n) => n.risk === "medium").length} medium risk
                    </Badge>
                    <Badge variant="success">
                      {result.affected_nodes.filter((n) => n.risk === "low").length} low risk
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Target Node */}
          <Card>
            <CardHeader>
              <CardTitle>Target</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: getNodeKindColor(result.target_node.kind) }}
                >
                  {result.target_node.kind[0].toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-surface-900">{result.target_node.name}</p>
                  <p className="text-xs text-surface-700/50 font-mono">{result.target_node.file_path}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Affected Nodes */}
          <Card>
            <CardHeader>
              <CardTitle>Affected Components ({result.affected_nodes.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.affected_nodes.map((affected, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 rounded-lg border p-4 ${
                      affected.risk === "high" ? "border-red-200 bg-red-50/50" :
                      affected.risk === "medium" ? "border-yellow-200 bg-yellow-50/50" :
                      "border-green-200 bg-green-50/50"
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: getNodeKindColor(affected.node.kind) }}
                    >
                      {affected.node.kind[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-surface-800">{affected.node.name}</span>
                        <Badge variant={
                          affected.risk === "high" ? "error" :
                          affected.risk === "medium" ? "warning" : "success"
                        }>
                          {affected.risk}
                        </Badge>
                        <Badge>{affected.impact_type}</Badge>
                        <Badge variant="info">{affected.relationship}</Badge>
                        <span className="text-xs text-surface-700/40">depth: {affected.distance}</span>
                      </div>
                      <p className="text-xs text-surface-700/50 font-mono mt-0.5">
                        {affected.node.file_path}:{affected.node.start_line}
                      </p>
                      <p className="text-sm text-surface-700 mt-1">{affected.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <EmptyState
          title="Analyze change impact"
          description="Enter a file path to see what components would be affected by changes."
          icon={
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          }
        />
      )}
    </div>
  );
}
