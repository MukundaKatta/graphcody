"use client";

import { useState, useCallback } from "react";
import { useRepos } from "@/hooks/use-repos";
import { reviewApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ReviewPanel } from "@/components/review/review-panel";
import type { ReviewResult } from "@/types";

const FOCUS_AREAS = [
  { value: "performance", label: "Performance" },
  { value: "security", label: "Security" },
  { value: "readability", label: "Readability" },
  { value: "error-handling", label: "Error Handling" },
  { value: "testing", label: "Testability" },
  { value: "best-practices", label: "Best Practices" },
];

export default function ReviewPage() {
  const { repos } = useRepos();
  const { activeRepo } = useAppStore();

  const [repoId, setRepoId] = useState(activeRepo?.id || "");
  const [filePath, setFilePath] = useState("");
  const [diff, setDiff] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleFocus = (area: string) => {
    setFocusAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  };

  const handleReview = useCallback(async () => {
    if (!repoId || !filePath.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await reviewApi.review({
        repo_id: repoId,
        file_path: filePath.trim(),
        diff: diff || undefined,
        focus_areas: focusAreas.length > 0 ? focusAreas : undefined,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [repoId, filePath, diff, focusAreas]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Code Review Assistant</h1>
        <p className="text-sm text-surface-700/60 mt-1">
          AI-powered code review with context-aware suggestions
        </p>
      </div>

      {/* Input */}
      <Card>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-3">
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
                  placeholder="e.g. src/components/UserForm.tsx"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                Diff (optional - paste git diff for change-specific review)
              </label>
              <textarea
                value={diff}
                onChange={(e) => setDiff(e.target.value)}
                placeholder="Paste a git diff here for change-specific review..."
                rows={4}
                className="w-full rounded-lg border border-surface-200 bg-white px-4 py-2.5 text-sm font-mono text-surface-800 placeholder:text-surface-700/40 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">Focus Areas</label>
              <div className="flex flex-wrap gap-2">
                {FOCUS_AREAS.map((area) => (
                  <button
                    key={area.value}
                    onClick={() => toggleFocus(area.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      focusAreas.includes(area.value)
                        ? "bg-brand-600 text-white"
                        : "bg-surface-100 text-surface-700 hover:bg-surface-200"
                    }`}
                  >
                    {area.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleReview} loading={loading} disabled={!repoId || !filePath.trim()}>
                Start Review
              </Button>
            </div>
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
            <p className="text-sm text-surface-700/50 mt-4">Reviewing code with full context...</p>
          </div>
        </div>
      ) : result ? (
        <ReviewPanel result={result} />
      ) : (
        <EmptyState
          title="AI Code Review"
          description="Select a file to get an AI-powered code review with context from the entire codebase."
          icon={
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      )}
    </div>
  );
}
