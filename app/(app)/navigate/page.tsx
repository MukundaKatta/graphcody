"use client";

import { useState, useCallback } from "react";
import { useRepos } from "@/hooks/use-repos";
import { navApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { getNodeKindColor } from "@/lib/utils";
import type { DefinitionResult, ReferenceResult } from "@/types";

export default function NavigatePage() {
  const { repos } = useRepos();
  const { activeRepo } = useAppStore();

  const [repoId, setRepoId] = useState(activeRepo?.id || "");
  const [symbol, setSymbol] = useState("");
  const [definitions, setDefinitions] = useState<DefinitionResult[]>([]);
  const [references, setReferences] = useState<ReferenceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  const handleGoToDefinition = useCallback(async () => {
    if (!repoId || !symbol.trim()) return;
    setLoading(true);
    try {
      const res = await navApi.goToDefinition(repoId, symbol.trim());
      setDefinitions(res.definitions);
      setReferences([]);
      if (res.definitions.length > 0) {
        setActiveNodeId(res.definitions[0].node.id);
      }
    } catch {
      setDefinitions([]);
    } finally {
      setLoading(false);
    }
  }, [repoId, symbol]);

  const handleFindReferences = useCallback(async (nodeId: string) => {
    if (!repoId) return;
    setLoading(true);
    try {
      const res = await navApi.findReferences(repoId, nodeId);
      setReferences(res.references);
      setActiveNodeId(nodeId);
    } catch {
      setReferences([]);
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Code Navigation</h1>
        <p className="text-sm text-surface-700/60 mt-1">
          Go to definition, find references, and trace symbols across your codebase
        </p>
      </div>

      {/* Search Controls */}
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
              <label className="block text-sm font-medium text-surface-700 mb-1">Symbol</label>
              <Input
                placeholder="e.g. handleSubmit, UserService, fetchData"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGoToDefinition()}
              />
            </div>
            <Button onClick={handleGoToDefinition} loading={loading} disabled={!repoId || !symbol.trim()}>
              Go to Definition
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Tabs
        tabs={[
          { id: "definitions", label: `Definitions (${definitions.length})` },
          { id: "references", label: `References (${references.length})` },
        ]}
      >
        {(tab) => (
          <div>
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : tab === "definitions" ? (
              definitions.length === 0 ? (
                <EmptyState
                  title="No definitions found"
                  description="Enter a symbol name and click Go to Definition"
                />
              ) : (
                <div className="space-y-3">
                  {definitions.map((def, idx) => (
                    <Card key={idx}>
                      <CardContent>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold mt-0.5"
                              style={{ backgroundColor: getNodeKindColor(def.node.kind) }}
                            >
                              {def.node.kind[0].toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-semibold text-surface-900">{def.node.name}</h3>
                              <p className="text-xs text-surface-700/50 font-mono">
                                {def.file_path}:{def.line}
                              </p>
                              <Badge className="mt-1">{def.node.kind}</Badge>
                              {def.node.signature && (
                                <pre className="mt-2 text-xs bg-surface-50 rounded-lg p-3 overflow-x-auto">
                                  <code>{def.node.signature}</code>
                                </pre>
                              )}
                              <pre className="mt-2 text-xs bg-surface-50 rounded-lg p-3 overflow-x-auto">
                                <code>{def.preview}</code>
                              </pre>
                            </div>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleFindReferences(def.node.id)}
                          >
                            Find References
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            ) : references.length === 0 ? (
              <EmptyState
                title="No references found"
                description={activeNodeId ? "No references to this symbol were found" : "Select a definition first, then click Find References"}
              />
            ) : (
              <div className="space-y-2">
                {references.map((ref, idx) => (
                  <Card key={idx}>
                    <CardContent>
                      <div className="flex items-start gap-3">
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-bold mt-0.5"
                          style={{ backgroundColor: getNodeKindColor(ref.node.kind) }}
                        >
                          {ref.node.kind[0].toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-surface-800">{ref.node.name}</span>
                            <Badge variant="info">{ref.kind}</Badge>
                          </div>
                          <p className="text-xs text-surface-700/50 font-mono mt-0.5">
                            {ref.file_path}:{ref.line}
                          </p>
                          <pre className="mt-2 text-xs bg-surface-50 rounded-lg p-3 overflow-x-auto">
                            <code>{ref.context}</code>
                          </pre>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </Tabs>
    </div>
  );
}
