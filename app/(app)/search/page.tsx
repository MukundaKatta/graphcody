"use client";

import { useState } from "react";
import { useSearch } from "@/hooks/use-search";
import { useRepos } from "@/hooks/use-repos";
import { useAppStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { SearchResults } from "@/components/search/search-results";
import type { NodeKind, SearchResult } from "@/types";

const KIND_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All Types" },
  { value: "function", label: "Functions" },
  { value: "class", label: "Classes" },
  { value: "method", label: "Methods" },
  { value: "interface", label: "Interfaces" },
  { value: "type", label: "Types" },
  { value: "component", label: "Components" },
  { value: "hook", label: "Hooks" },
  { value: "variable", label: "Variables" },
  { value: "module", label: "Modules" },
];

const LANG_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All Languages" },
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "rust", label: "Rust" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
];

export default function SearchPage() {
  const { repos } = useRepos();
  const { results, isSearching, error, search, crossRepoSearch } = useSearch();
  const { activeRepo } = useAppStore();

  const [query, setQuery] = useState("");
  const [selectedKind, setSelectedKind] = useState("");
  const [selectedLang, setSelectedLang] = useState("");
  const [selectedRepoId, setSelectedRepoId] = useState(activeRepo?.id || "");

  const handleSearch = (mode: "semantic" | "cross-repo") => {
    const filters = {
      query,
      repo_ids: selectedRepoId ? [selectedRepoId] : undefined,
      kinds: selectedKind ? [selectedKind as NodeKind] : undefined,
      languages: selectedLang ? [selectedLang] : undefined,
      limit: 50,
    };

    if (mode === "cross-repo") {
      crossRepoSearch(filters);
    } else {
      search(filters);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    window.open(`/navigate?repo=${result.repo_name}&file=${result.file_path}&line=${result.line_start}`, "_blank");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Code Search</h1>
        <p className="text-sm text-surface-700/60 mt-1">
          Semantic search powered by embeddings and code graph analysis
        </p>
      </div>

      {/* Search Bar */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="Search by meaning... e.g. 'authentication middleware' or 'database connection pool'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch("semantic")}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
          <Button onClick={() => handleSearch("semantic")} loading={isSearching}>
            Search
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <Select
            options={[{ value: "", label: "All Repositories" }, ...repos.map((r) => ({ value: r.id, label: `${r.owner}/${r.name}` }))]}
            value={selectedRepoId}
            onChange={(e) => setSelectedRepoId(e.target.value)}
          />
          <Select options={KIND_OPTIONS} value={selectedKind} onChange={(e) => setSelectedKind(e.target.value)} />
          <Select options={LANG_OPTIONS} value={selectedLang} onChange={(e) => setSelectedLang(e.target.value)} />
        </div>
      </div>

      {/* Results */}
      <Tabs
        tabs={[
          { id: "semantic", label: "Semantic Search" },
          { id: "cross-repo", label: "Cross-Repo Search" },
        ]}
        onChange={(tab) => {
          if (query) handleSearch(tab as "semantic" | "cross-repo");
        }}
      >
        {() => (
          <div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {isSearching ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : (
              <>
                {results.length > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <Badge variant="info">{results.length} results</Badge>
                    {selectedKind && <Badge>{selectedKind}</Badge>}
                    {selectedLang && <Badge>{selectedLang}</Badge>}
                  </div>
                )}
                <SearchResults results={results} onResultClick={handleResultClick} />
              </>
            )}
          </div>
        )}
      </Tabs>
    </div>
  );
}
