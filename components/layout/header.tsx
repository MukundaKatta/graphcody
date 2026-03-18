"use client";

import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

export function Header() {
  const { toggleSidebar, setCommandPaletteOpen, activeRepo } = useAppStore();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-surface-200 bg-white/80 backdrop-blur-sm px-6 py-3">
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-surface-100 text-surface-700/60">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {activeRepo && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-surface-700/50">/</span>
            <span className="text-sm font-medium text-surface-800">
              {activeRepo.owner}/{activeRepo.name}
            </span>
            <span className={`inline-block w-2 h-2 rounded-full ${
              activeRepo.status === "indexed" ? "bg-green-500" :
              activeRepo.status === "indexing" ? "bg-yellow-500 animate-pulse" :
              activeRepo.status === "error" ? "bg-red-500" : "bg-gray-400"
            }`} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCommandPaletteOpen(true)}
          className="gap-2 text-surface-700/60"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-xs">Search...</span>
          <kbd className="hidden sm:inline-flex items-center rounded border border-surface-200 px-1.5 py-0.5 text-xs text-surface-700/50">
            Cmd+K
          </kbd>
        </Button>
      </div>
    </header>
  );
}
