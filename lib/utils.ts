import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

export function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    typescript: "#3178c6",
    javascript: "#f7df1e",
    python: "#3572a5",
    rust: "#dea584",
    go: "#00add8",
    java: "#b07219",
    ruby: "#701516",
    cpp: "#f34b7d",
    c: "#555555",
    csharp: "#178600",
    php: "#4f5d95",
    swift: "#f05138",
    kotlin: "#a97bff",
    html: "#e34c26",
    css: "#563d7c",
    scss: "#c6538c",
    vue: "#41b883",
    svelte: "#ff3e00",
    default: "#6366f1",
  };
  return colors[language.toLowerCase()] || colors.default;
}

export function getNodeKindIcon(kind: string): string {
  const icons: Record<string, string> = {
    module: "M",
    class: "C",
    function: "F",
    method: "m",
    variable: "v",
    constant: "K",
    interface: "I",
    type: "T",
    enum: "E",
    import: "i",
    export: "x",
    component: "R",
    hook: "H",
    route: "r",
    middleware: "w",
  };
  return icons[kind] || "?";
}

export function getNodeKindColor(kind: string): string {
  const colors: Record<string, string> = {
    module: "#818cf8",
    class: "#f59e0b",
    function: "#10b981",
    method: "#06b6d4",
    variable: "#8b5cf6",
    constant: "#ef4444",
    interface: "#3b82f6",
    type: "#ec4899",
    enum: "#f97316",
    import: "#6b7280",
    export: "#14b8a6",
    component: "#6366f1",
    hook: "#8b5cf6",
    route: "#22c55e",
    middleware: "#eab308",
  };
  return colors[kind] || "#6b7280";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return Math.floor(seconds / 60) + "m ago";
  if (seconds < 86400) return Math.floor(seconds / 3600) + "h ago";
  if (seconds < 604800) return Math.floor(seconds / 86400) + "d ago";
  return date.toLocaleDateString();
}

export function extractRepoInfo(url: string): { owner: string; name: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { owner: match[1], name: match[2].replace(/\.git$/, "") };
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
