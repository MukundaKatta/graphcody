"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Input } from "@/components/ui/input";

interface CommandItem {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: string;
}

const commands: CommandItem[] = [
  { id: "dashboard", label: "Go to Dashboard", description: "Overview and stats", href: "/dashboard", icon: "H" },
  { id: "repos", label: "Manage Repositories", description: "Connect and index repos", href: "/repos", icon: "R" },
  { id: "search", label: "Semantic Search", description: "Search across codebases", href: "/search", icon: "S" },
  { id: "graph", label: "Code Graph", description: "Visualize dependencies", href: "/graph", icon: "G" },
  { id: "chat", label: "Chat with Code", description: "AI-powered codebase Q&A", href: "/chat", icon: "C" },
  { id: "navigate", label: "Code Navigation", description: "Go to definition, find refs", href: "/navigate", icon: "N" },
  { id: "impact", label: "Impact Analysis", description: "Analyze change impact", href: "/impact", icon: "I" },
  { id: "review", label: "Code Review", description: "AI code review assistant", href: "/review", icon: "V" },
  { id: "docs", label: "Generate Docs", description: "Auto-generate documentation", href: "/docs", icon: "D" },
  { id: "onboarding", label: "Onboarding Guide", description: "Generate onboarding guides", href: "/onboarding", icon: "O" },
];

export function CommandPalette() {
  const router = useRouter();
  const { commandPaletteOpen, setCommandPaletteOpen } = useAppStore();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = commands.filter(
    (cmd) =>
      cmd.label.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = useCallback(
    (item: CommandItem) => {
      router.push(item.href);
      setCommandPaletteOpen(false);
      setQuery("");
    },
    [router, setCommandPaletteOpen]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  useEffect(() => {
    if (commandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSelectedIndex(0);
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    if (!commandPaletteOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex]);
      } else if (e.key === "Escape") {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [commandPaletteOpen, filtered, selectedIndex, handleSelect, setCommandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="fixed inset-0 bg-black/50 animate-fade-in" onClick={() => setCommandPaletteOpen(false)} />
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl animate-slide-up">
        <div className="bg-white rounded-2xl shadow-2xl border border-surface-200 overflow-hidden">
          <div className="p-4 border-b border-surface-200">
            <Input
              ref={inputRef}
              placeholder="Type a command or search..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {filtered.length === 0 && (
              <p className="text-center py-8 text-sm text-surface-700/50">No results found</p>
            )}
            {filtered.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  idx === selectedIndex ? "bg-brand-50 text-brand-700" : "text-surface-700 hover:bg-surface-50"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center text-sm font-bold text-surface-700/60">
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-surface-700/50">{item.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
