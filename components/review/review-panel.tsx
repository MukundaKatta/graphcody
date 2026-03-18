"use client";

import type { ReviewResult, ReviewIssue, ReviewSuggestion } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ReviewPanelProps {
  result: ReviewResult;
}

function getSeverityVariant(severity: ReviewIssue["severity"]): "error" | "warning" | "info" {
  return severity;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
}

export function ReviewPanel({ result }: ReviewPanelProps) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Code Review: {result.file_path}</CardTitle>
            <div className={`text-3xl font-bold ${getScoreColor(result.overall_score)}`}>
              {result.overall_score}
              <span className="text-sm font-normal text-surface-700/50">/100</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-surface-700">{result.summary}</p>
        </CardContent>
      </Card>

      {/* Issues */}
      {result.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Issues ({result.issues.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {result.issues.map((issue: ReviewIssue, idx: number) => (
                <div key={idx} className="flex gap-3 rounded-lg border border-surface-200 p-3">
                  <Badge variant={getSeverityVariant(issue.severity)}>
                    {issue.severity}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-surface-700/50">L{issue.line}</span>
                      <Badge>{issue.category}</Badge>
                    </div>
                    <p className="text-sm text-surface-800">{issue.message}</p>
                    {issue.suggestion && (
                      <p className="text-xs text-brand-600 mt-1">{issue.suggestion}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Suggestions */}
      {result.suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Suggestions ({result.suggestions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {result.suggestions.map((sug: ReviewSuggestion, idx: number) => (
                <div key={idx} className="border border-surface-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-surface-800 mb-2">{sug.title}</h4>
                  <p className="text-sm text-surface-700/70 mb-3">{sug.description}</p>

                  {sug.code_before && sug.code_after && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-xs text-red-600 font-medium mb-1">Before</p>
                        <pre className="text-xs bg-red-50 rounded-lg p-3 overflow-x-auto">
                          <code>{sug.code_before}</code>
                        </pre>
                      </div>
                      <div>
                        <p className="text-xs text-green-600 font-medium mb-1">After</p>
                        <pre className="text-xs bg-green-50 rounded-lg p-3 overflow-x-auto">
                          <code>{sug.code_after}</code>
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
