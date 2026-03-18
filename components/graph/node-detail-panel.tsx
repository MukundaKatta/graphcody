"use client";

import { useState } from "react";
import useSWR from "swr";
import { graphApi, navApi, impactApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs } from "@/components/ui/tabs";
import { getNodeKindColor } from "@/lib/utils";
import type { GraphNode } from "@/types";

interface NodeDetailPanelProps {
  nodeId: string;
  repoId: string;
  onNavigate?: (nodeId: string) => void;
  onClose?: () => void;
}

export function NodeDetailPanel({ nodeId, repoId, onNavigate, onClose }: NodeDetailPanelProps) {
  const [showImpact, setShowImpact] = useState(false);

  const { data: node, isLoading } = useSWR(`node-${nodeId}`, () => graphApi.getNode(nodeId));
  const { data: neighbors } = useSWR(`neighbors-${nodeId}`, () => graphApi.getNeighbors(nodeId, 1));
  const { data: refs } = useSWR(`refs-${nodeId}`, () => navApi.findReferences(repoId, nodeId));
  const { data: impact, isLoading: impactLoading } = useSWR(
    showImpact ? `impact-${nodeId}` : null,
    () => impactApi.analyze(repoId, nodeId)
  );

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!node) return null;

  const typedNode = node as GraphNode;

  return (
    <div className="bg-white border-l border-surface-200 w-96 h-full overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-surface-200 p-4 z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: getNodeKindColor(typedNode.kind) }}
            >
              {typedNode.kind[0].toUpperCase()}
            </div>
            <h3 className="font-semibold text-surface-900">{typedNode.name}</h3>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 rounded hover:bg-surface-100 text-surface-700/50">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <p className="text-xs text-surface-700/50 font-mono">{typedNode.qualified_name}</p>
      </div>

      <Tabs
        tabs={[
          { id: "info", label: "Info" },
          { id: "connections", label: "Connections" },
          { id: "references", label: "References" },
          { id: "impact", label: "Impact" },
        ]}
      >
        {(tab) => (
          <div className="p-4">
            {tab === "info" && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-surface-700/50 mb-1">Kind</p>
                  <Badge>{typedNode.kind}</Badge>
                </div>
                <div>
                  <p className="text-xs font-medium text-surface-700/50 mb-1">File</p>
                  <p className="text-sm font-mono text-surface-700">{typedNode.file_path}</p>
                  <p className="text-xs text-surface-700/50">Lines {typedNode.start_line}-{typedNode.end_line}</p>
                </div>
                {typedNode.signature && (
                  <div>
                    <p className="text-xs font-medium text-surface-700/50 mb-1">Signature</p>
                    <pre className="text-xs bg-surface-50 rounded-lg p-3 overflow-x-auto">
                      <code>{typedNode.signature}</code>
                    </pre>
                  </div>
                )}
                {typedNode.docstring && (
                  <div>
                    <p className="text-xs font-medium text-surface-700/50 mb-1">Documentation</p>
                    <p className="text-sm text-surface-700">{typedNode.docstring}</p>
                  </div>
                )}
              </div>
            )}

            {tab === "connections" && (
              <div className="space-y-2">
                {neighbors?.nodes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => onNavigate?.(n.id)}
                    className="w-full text-left flex items-center gap-2 rounded-lg p-2 hover:bg-surface-50 transition-colors"
                  >
                    <div
                      className="w-4 h-4 rounded text-white text-[8px] font-bold flex items-center justify-center"
                      style={{ backgroundColor: getNodeKindColor(n.kind) }}
                    >
                      {n.kind[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-surface-800 truncate">{n.name}</p>
                      <p className="text-[10px] text-surface-700/50 truncate">{n.filePath}</p>
                    </div>
                    <Badge variant="default">{n.kind}</Badge>
                  </button>
                )) || <p className="text-sm text-surface-700/50">No connections found</p>}
              </div>
            )}

            {tab === "references" && (
              <div className="space-y-2">
                {refs?.references.map((ref, idx) => (
                  <button
                    key={idx}
                    onClick={() => onNavigate?.(ref.node.id)}
                    className="w-full text-left rounded-lg border border-surface-200 p-3 hover:border-brand-300 transition-colors"
                  >
                    <p className="text-xs font-mono text-surface-700/60 mb-1">{ref.file_path}:{ref.line}</p>
                    <pre className="text-xs bg-surface-50 rounded p-2 overflow-x-auto">
                      <code>{ref.context}</code>
                    </pre>
                    <Badge variant="info" className="mt-1">{ref.kind}</Badge>
                  </button>
                )) || <p className="text-sm text-surface-700/50">No references found</p>}
              </div>
            )}

            {tab === "impact" && (
              <div className="space-y-4">
                {!showImpact ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-surface-700/60 mb-3">
                      Analyze what would break if this symbol changes
                    </p>
                    <Button onClick={() => setShowImpact(true)} size="sm">
                      Run Impact Analysis
                    </Button>
                  </div>
                ) : impactLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Spinner />
                  </div>
                ) : impact ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Risk Score:</span>
                      <span className={`text-lg font-bold ${
                        impact.risk_score > 0.7 ? "text-red-600" :
                        impact.risk_score > 0.4 ? "text-yellow-600" : "text-green-600"
                      }`}>
                        {Math.round(impact.risk_score * 100)}%
                      </span>
                    </div>
                    <p className="text-sm text-surface-700">{impact.summary}</p>
                    <div className="space-y-2">
                      {impact.affected_nodes.map((affected, idx) => (
                        <div key={idx} className="rounded-lg border border-surface-200 p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">{affected.node.name}</span>
                            <Badge variant={
                              affected.risk === "high" ? "error" :
                              affected.risk === "medium" ? "warning" : "success"
                            }>
                              {affected.risk}
                            </Badge>
                            <Badge>{affected.impact_type}</Badge>
                          </div>
                          <p className="text-xs text-surface-700/60">{affected.reason}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>
        )}
      </Tabs>
    </div>
  );
}
