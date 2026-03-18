"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRepos } from "@/hooks/use-repos";
import { docsApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import type { GeneratedDoc } from "@/types";

export default function DocsPage() {
  const { repos } = useRepos();
  const { activeRepo } = useAppStore();

  const [repoId, setRepoId] = useState(activeRepo?.id || "");
  const [filePath, setFilePath] = useState("");
  const [style, setStyle] = useState<"jsdoc" | "markdown" | "readme" | "api">("markdown");
  const [doc, setDoc] = useState<GeneratedDoc | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = useCallback(async () => {
    if (!repoId) return;
    setLoading(true);
    setError("");
    try {
      const res = await docsApi.generate({
        repo_id: repoId,
        file_path: filePath || undefined,
        style,
      });
      setDoc(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
      setDoc(null);
    } finally {
      setLoading(false);
    }
  }, [repoId, filePath, style]);

  const handleCopy = () => {
    if (doc) {
      navigator.clipboard.writeText(doc.content);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Documentation Generator</h1>
        <p className="text-sm text-surface-700/60 mt-1">
          Auto-generate documentation from your code graph
        </p>
      </div>

      {/* Input */}
      <Card>
        <CardContent>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="w-56">
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
            <div className="flex-1 min-w-48">
              <label className="block text-sm font-medium text-surface-700 mb-1">
                File Path (optional, leave empty for full repo docs)
              </label>
              <Input
                placeholder="e.g. src/services/auth.ts"
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Select
                label="Style"
                options={[
                  { value: "markdown", label: "Markdown" },
                  { value: "jsdoc", label: "JSDoc" },
                  { value: "readme", label: "README" },
                  { value: "api", label: "API Reference" },
                ]}
                value={style}
                onChange={(e) => setStyle(e.target.value as typeof style)}
              />
            </div>
            <Button onClick={handleGenerate} loading={loading} disabled={!repoId}>
              Generate
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
            <p className="text-sm text-surface-700/50 mt-4">Generating documentation...</p>
          </div>
        </div>
      ) : doc ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{doc.title}</CardTitle>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={handleCopy}>
                  Copy
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([doc.content], { type: "text/markdown" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${doc.title.toLowerCase().replace(/\s+/g, "-")}.md`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  Download
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none prose-pre:bg-surface-800 prose-pre:text-surface-50">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{doc.content}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          title="Generate documentation"
          description="Select a repository and optionally a file path to auto-generate documentation."
          icon={
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
      )}
    </div>
  );
}
