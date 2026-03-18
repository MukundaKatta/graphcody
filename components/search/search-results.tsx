"use client";

import { Badge } from "@/components/ui/badge";
import { getNodeKindColor, getLanguageColor } from "@/lib/utils";
import type { SearchResult } from "@/types";

interface SearchResultsProps {
  results: SearchResult[];
  onResultClick?: (result: SearchResult) => void;
}

export function SearchResults({ results, onResultClick }: SearchResultsProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-12 text-surface-700/50">
        <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p className="text-sm">No results found. Try a different query.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {results.map((result) => (
        <button
          key={result.id}
          onClick={() => onResultClick?.(result)}
          className="w-full text-left rounded-xl border border-surface-200 bg-white hover:border-brand-300 hover:shadow-sm transition-all p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold"
              style={{ backgroundColor: getNodeKindColor(result.kind) }}
            >
              {result.kind[0].toUpperCase()}
            </div>
            <span className="font-medium text-sm text-surface-800">{result.name}</span>
            <Badge variant="default">{result.kind}</Badge>
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: getLanguageColor(result.language) }}
            />
            <span className="text-xs text-surface-700/50">{result.language}</span>
            <span className="ml-auto text-xs text-surface-700/50">
              {Math.round(result.score * 100)}% match
            </span>
          </div>

          <p className="text-xs text-surface-700/60 mb-2">
            {result.repo_name} / {result.file_path}
            <span className="ml-1">L{result.line_start}-{result.line_end}</span>
          </p>

          <pre className="text-xs bg-surface-50 rounded-lg p-3 overflow-x-auto">
            <code className="text-surface-700">{result.snippet}</code>
          </pre>
        </button>
      ))}
    </div>
  );
}
