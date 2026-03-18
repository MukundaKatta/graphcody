"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRepos } from "@/hooks/use-repos";
import { onboardingApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import type { OnboardingGuide } from "@/types";

export default function OnboardingPage() {
  const { repos } = useRepos();
  const { activeRepo } = useAppStore();

  const [repoId, setRepoId] = useState(activeRepo?.id || "");
  const [guide, setGuide] = useState<OnboardingGuide | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!repoId) return;
    setLoading(true);
    setError("");
    try {
      const res = await onboardingApi.generate(repoId);
      setGuide(res);
      setExpandedSection(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  const handleLoad = useCallback(async () => {
    if (!repoId) return;
    setLoading(true);
    try {
      const res = await onboardingApi.get(repoId);
      setGuide(res);
      setExpandedSection(0);
    } catch {
      // No existing guide
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Onboarding Guide Generator</h1>
        <p className="text-sm text-surface-700/60 mt-1">
          Generate comprehensive onboarding guides to help new developers understand the codebase
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
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
                onChange={(e) => {
                  setRepoId(e.target.value);
                  setGuide(null);
                }}
              />
            </div>
            <Button variant="secondary" onClick={handleLoad} disabled={!repoId || loading}>
              Load Existing
            </Button>
            <Button onClick={handleGenerate} loading={loading} disabled={!repoId}>
              Generate Guide
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
            <p className="text-sm text-surface-700/50 mt-4">Analyzing codebase and generating guide...</p>
          </div>
        </div>
      ) : guide ? (
        <div className="space-y-4">
          {/* Guide Header */}
          <Card>
            <CardHeader>
              <CardTitle>Onboarding Guide: {guide.repo_name}</CardTitle>
              <CardDescription>
                Generated from code graph analysis - {guide.sections.length} sections
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Table of Contents */}
          <Card>
            <CardHeader>
              <CardTitle>Table of Contents</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-1">
                {guide.sections.map((section, idx) => (
                  <li key={idx}>
                    <button
                      onClick={() => setExpandedSection(idx)}
                      className={`text-sm hover:text-brand-600 transition-colors ${
                        expandedSection === idx ? "text-brand-600 font-medium" : "text-surface-700"
                      }`}
                    >
                      {idx + 1}. {section.title}
                    </button>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {/* Sections */}
          {guide.sections.map((section, idx) => (
            <Card key={idx}>
              <CardHeader>
                <button
                  onClick={() => setExpandedSection(expandedSection === idx ? null : idx)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm">
                        {idx + 1}
                      </div>
                      <CardTitle>{section.title}</CardTitle>
                    </div>
                    <svg
                      className={`w-5 h-5 text-surface-700/50 transition-transform ${
                        expandedSection === idx ? "rotate-180" : ""
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
              </CardHeader>
              {expandedSection === idx && (
                <CardContent>
                  <div className="prose prose-sm max-w-none prose-pre:bg-surface-800 prose-pre:text-surface-50">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content}</ReactMarkdown>
                  </div>

                  {section.key_files.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-surface-200">
                      <p className="text-xs font-medium text-surface-700/50 mb-2">Key Files</p>
                      <div className="flex flex-wrap gap-1">
                        {section.key_files.map((file) => (
                          <Badge key={file} variant="default">
                            <span className="font-mono">{file}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Generate an onboarding guide"
          description="Select a repository to auto-generate a comprehensive guide for new developers."
          icon={
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
        />
      )}
    </div>
  );
}
