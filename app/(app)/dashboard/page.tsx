"use client";

import Link from "next/link";
import { useRepos } from "@/hooks/use-repos";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { timeAgo } from "@/lib/utils";

export default function DashboardPage() {
  const { repos, isLoading } = useRepos();

  const indexed = repos.filter((r) => r.status === "indexed");
  const totalFiles = repos.reduce((sum, r) => sum + r.file_count, 0);
  const totalNodes = repos.reduce((sum, r) => sum + r.node_count, 0);
  const totalEdges = repos.reduce((sum, r) => sum + r.edge_count, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Dashboard</h1>
        <p className="text-sm text-surface-700/60 mt-1">Overview of your connected repositories and code intelligence</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Repositories", value: repos.length, color: "text-brand-600" },
          { label: "Files Indexed", value: totalFiles.toLocaleString(), color: "text-green-600" },
          { label: "Graph Nodes", value: totalNodes.toLocaleString(), color: "text-blue-600" },
          { label: "Graph Edges", value: totalEdges.toLocaleString(), color: "text-purple-600" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent>
              <p className="text-sm text-surface-700/60">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color} mt-1`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Connect Repository", href: "/repos", description: "Add a GitHub repo", icon: "+" },
          { label: "Search Code", href: "/search", description: "Semantic search", icon: "S" },
          { label: "View Graph", href: "/graph", description: "Visualize dependencies", icon: "G" },
          { label: "Chat", href: "/chat", description: "Ask about code", icon: "C" },
        ].map((action) => (
          <Link key={action.href} href={action.href}>
            <Card hover className="h-full">
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center text-brand-600 font-bold">
                    {action.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-surface-800">{action.label}</p>
                    <p className="text-xs text-surface-700/50">{action.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Repositories */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Repositories</CardTitle>
              <CardDescription>{indexed.length} indexed, {repos.length - indexed.length} pending</CardDescription>
            </div>
            <Link href="/repos">
              <Button variant="secondary" size="sm">View All</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {repos.length === 0 ? (
            <EmptyState
              title="No repositories"
              description="Connect a GitHub repository to get started with code analysis."
              action={
                <Link href="/repos">
                  <Button>Connect Repository</Button>
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {repos.slice(0, 5).map((repo) => (
                <Link
                  key={repo.id}
                  href={`/graph?repo=${repo.id}`}
                  className="flex items-center justify-between rounded-lg border border-surface-200 p-4 hover:border-brand-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-surface-700/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-surface-800">
                        {repo.owner}/{repo.name}
                      </p>
                      <p className="text-xs text-surface-700/50">
                        {repo.file_count} files &middot; {repo.node_count} nodes &middot; {repo.language || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
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
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
