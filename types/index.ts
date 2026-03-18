// ==================== Repository Types ====================
export interface Repository {
  id: string;
  user_id: string;
  github_url: string;
  name: string;
  owner: string;
  default_branch: string;
  language: string | null;
  description: string | null;
  status: "pending" | "indexing" | "indexed" | "error";
  indexed_at: string | null;
  file_count: number;
  node_count: number;
  edge_count: number;
  created_at: string;
  updated_at: string;
}

export interface FileNode {
  id: string;
  repo_id: string;
  path: string;
  name: string;
  extension: string;
  language: string;
  content: string;
  content_hash: string;
  line_count: number;
  size_bytes: number;
  embedding: number[] | null;
  created_at: string;
}

// ==================== Code Graph Types ====================
export interface GraphNode {
  id: string;
  repo_id: string;
  file_id: string;
  name: string;
  qualified_name: string;
  kind: NodeKind;
  start_line: number;
  end_line: number;
  file_path: string;
  signature: string | null;
  docstring: string | null;
  embedding: number[] | null;
  metadata: Record<string, unknown>;
}

export type NodeKind =
  | "module"
  | "class"
  | "function"
  | "method"
  | "variable"
  | "constant"
  | "interface"
  | "type"
  | "enum"
  | "import"
  | "export"
  | "component"
  | "hook"
  | "route"
  | "middleware";

export interface GraphEdge {
  id: string;
  repo_id: string;
  source_id: string;
  target_id: string;
  kind: EdgeKind;
  metadata: Record<string, unknown>;
}

export type EdgeKind =
  | "imports"
  | "calls"
  | "extends"
  | "implements"
  | "uses"
  | "defines"
  | "exports"
  | "overrides"
  | "type_of"
  | "returns"
  | "parameter_of"
  | "contains";

// ==================== Visualization Types ====================
export interface VisNode {
  id: string;
  name: string;
  kind: NodeKind;
  filePath: string;
  group: string;
  size: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  vx?: number;
  vy?: number;
}

export interface VisEdge {
  source: string | VisNode;
  target: string | VisNode;
  kind: EdgeKind;
  strength: number;
}

export interface GraphData {
  nodes: VisNode[];
  edges: VisEdge[];
}

// ==================== Search Types ====================
export interface SearchResult {
  id: string;
  file_path: string;
  name: string;
  kind: NodeKind;
  snippet: string;
  score: number;
  line_start: number;
  line_end: number;
  repo_name: string;
  language: string;
}

export interface SearchFilters {
  query: string;
  repo_ids?: string[];
  kinds?: NodeKind[];
  languages?: string[];
  limit?: number;
}

// ==================== Chat Types ====================
export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  context_nodes?: string[];
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  repo_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

// ==================== Impact Analysis Types ====================
export interface ImpactResult {
  target_node: GraphNode;
  affected_nodes: AffectedNode[];
  risk_score: number;
  summary: string;
}

export interface AffectedNode {
  node: GraphNode;
  impact_type: "direct" | "transitive";
  relationship: EdgeKind;
  distance: number;
  risk: "high" | "medium" | "low";
  reason: string;
}

// ==================== Code Review Types ====================
export interface ReviewRequest {
  repo_id: string;
  file_path: string;
  diff?: string;
  content?: string;
  focus_areas?: string[];
}

export interface ReviewResult {
  file_path: string;
  overall_score: number;
  summary: string;
  issues: ReviewIssue[];
  suggestions: ReviewSuggestion[];
}

export interface ReviewIssue {
  line: number;
  severity: "error" | "warning" | "info";
  category: string;
  message: string;
  suggestion: string;
}

export interface ReviewSuggestion {
  title: string;
  description: string;
  code_before?: string;
  code_after?: string;
  line_start?: number;
  line_end?: number;
}

// ==================== Documentation Types ====================
export interface DocGenerationRequest {
  repo_id: string;
  node_id?: string;
  file_path?: string;
  style: "jsdoc" | "markdown" | "readme" | "api";
}

export interface GeneratedDoc {
  title: string;
  content: string;
  format: string;
  related_nodes: string[];
}

// ==================== Onboarding Types ====================
export interface OnboardingGuide {
  repo_id: string;
  repo_name: string;
  sections: OnboardingSection[];
  generated_at: string;
}

export interface OnboardingSection {
  title: string;
  content: string;
  key_files: string[];
  related_nodes: string[];
  order: number;
}

// ==================== Navigation Types ====================
export interface DefinitionResult {
  node: GraphNode;
  file_path: string;
  line: number;
  preview: string;
}

export interface ReferenceResult {
  node: GraphNode;
  file_path: string;
  line: number;
  context: string;
  kind: EdgeKind;
}

// ==================== User Types ====================
export interface User {
  id: string;
  email: string;
  github_username: string | null;
  avatar_url: string | null;
  github_access_token: string | null;
  created_at: string;
}
