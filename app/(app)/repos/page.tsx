"use client";

import { useState } from "react";
import { useRepos, useRepoStatus } from "@/hooks/use-repos";
import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { timeAgo, extractRepoInfo } from "@/lib/utils";
import type { Repository } from "@/types";

function RepoStatusTracker({ repo }: { repo: Repository }) {
  const status = useRepoStatus(repo.status === "indexing" ? repo.id : null);

  if (!status || repo.status !== "indexing") return null;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 text-xs text-surface-700/50">
        <Spinner size="sm" />
        <span>Indexing... {Math.round((status.progress || 0) * 100)}%</span>
      </div>
      <div className="w-full bg-surface-200 rounded-full h-1.5 mt-1">
        <div
          className="bg-brand-600 h-1.5 rounded-full transition-all"
          style={{ width: `${(status.progress || 0) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function ReposPage() {
  const { repos, isLoading, connectRepo, indexRepo, deleteRepo } = useRepos();
  const { setActiveRepo } = useAppStore();
  const [showConnect, setShowConnect] = useState(false);
  const [url, setUrl] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    const info = extractRepoInfo(url);
    if (!info) {
      setError("Invalid GitHub URL. Use format: https://github.com/owner/repo");
      return;
    }

    setConnecting(true);
    setError("");
    try {
      const repo = await connectRepo(url);
      setActiveRepo(repo);
      setShowConnect(false);
      setUrl("");
      await indexRepo(repo.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Repositories</h1>
          <p className="text-sm text-surface-700/60 mt-1">Connect GitHub repositories for code analysis</p>
        </div>
        <Button onClick={() => setShowConnect(true)}>Connect Repository</Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Spinner size="lg" />
        </div>
      ) : repos.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              title="No repositories connected"
              description="Connect a GitHub repository to start building your code graph and enable AI-powered code intelligence."
              action={<Button onClick={() => setShowConnect(true)}>Connect Repository</Button>}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {repos.map((repo) => (
            <Card key={repo.id} hover onClick={() => setActiveRepo(repo)}>
              <CardContent>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-surface-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-surface-700/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-surface-900">
                        {repo.owner}/{repo.name}
                      </h3>
                      {repo.description && (
                        <p className="text-sm text-surface-700/60 mt-0.5">{repo.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {repo.language && <Badge>{repo.language}</Badge>}
                        <span className="text-xs text-surface-700/50">{repo.file_count} files</span>
                        <span className="text-xs text-surface-700/50">{repo.node_count} nodes</span>
                        <span className="text-xs text-surface-700/50">{repo.edge_count} edges</span>
                      </div>
                      <RepoStatusTracker repo={repo} />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        repo.status === "indexed" ? "success" :
                        repo.status === "indexing" ? "warning" :
                        repo.status === "error" ? "error" : "default"
                      }
                    >
                      {repo.status}
                    </Badge>
                    <span className="text-xs text-surface-700/40">{timeAgo(repo.updated_at)}</span>
                    <div className="flex gap-1 ml-2">
                      {repo.status === "error" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            indexRepo(repo.id);
                          }}
                        >
                          Retry
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this repository?")) deleteRepo(repo.id);
                        }}
                        className="text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Connect Modal */}
      <Modal open={showConnect} onClose={() => setShowConnect(false)} title="Connect GitHub Repository">
        <div className="space-y-4">
          <Input
            placeholder="https://github.com/owner/repository"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError("");
            }}
            error={error}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            }
          />
          <p className="text-xs text-surface-700/50">
            We will clone the repository, parse all files, build a code graph, and generate embeddings for semantic search.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowConnect(false)}>
              Cancel
            </Button>
            <Button onClick={handleConnect} loading={connecting}>
              Connect & Index
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
