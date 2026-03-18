const BACKEND_BASE = "/api/backend";

interface ApiOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { method = "GET", body, headers = {}, signal } = options;

  const res = await fetch(`${BACKEND_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `API error: ${res.status}`);
  }

  return res.json();
}

// ==================== Repository API ====================
export const repoApi = {
  list: () => apiRequest<{ repositories: import("@/types").Repository[] }>("/repos"),

  get: (id: string) => apiRequest<import("@/types").Repository>(`/repos/${id}`),

  connect: (githubUrl: string) =>
    apiRequest<import("@/types").Repository>("/repos/connect", {
      method: "POST",
      body: { github_url: githubUrl },
    }),

  index: (id: string) =>
    apiRequest<{ status: string }>(`/repos/${id}/index`, { method: "POST" }),

  delete: (id: string) =>
    apiRequest<{ ok: boolean }>(`/repos/${id}`, { method: "DELETE" }),

  status: (id: string) =>
    apiRequest<{ status: string; progress: number }>(`/repos/${id}/status`),
};

// ==================== Search API ====================
export const searchApi = {
  semantic: (params: import("@/types").SearchFilters) =>
    apiRequest<{ results: import("@/types").SearchResult[] }>("/search/semantic", {
      method: "POST",
      body: params,
    }),

  code: (params: { query: string; repo_ids?: string[] }) =>
    apiRequest<{ results: import("@/types").SearchResult[] }>("/search/code", {
      method: "POST",
      body: params,
    }),

  crossRepo: (params: import("@/types").SearchFilters) =>
    apiRequest<{ results: import("@/types").SearchResult[] }>("/search/cross-repo", {
      method: "POST",
      body: params,
    }),
};

// ==================== Graph API ====================
export const graphApi = {
  getGraph: (repoId: string, params?: { depth?: number; root?: string }) =>
    apiRequest<import("@/types").GraphData>(
      `/graph/${repoId}?${new URLSearchParams(params as Record<string, string>).toString()}`
    ),

  getNode: (nodeId: string) =>
    apiRequest<import("@/types").GraphNode>(`/graph/node/${nodeId}`),

  getNeighbors: (nodeId: string, depth?: number) =>
    apiRequest<import("@/types").GraphData>(
      `/graph/node/${nodeId}/neighbors?depth=${depth || 1}`
    ),

  getDependencies: (repoId: string) =>
    apiRequest<import("@/types").GraphData>(`/graph/${repoId}/dependencies`),

  getCallChain: (nodeId: string) =>
    apiRequest<import("@/types").GraphData>(`/graph/node/${nodeId}/call-chain`),
};

// ==================== Chat API ====================
export const chatApi = {
  sessions: (repoId: string) =>
    apiRequest<{ sessions: import("@/types").ChatSession[] }>(
      `/chat/sessions?repo_id=${repoId}`
    ),

  getSession: (sessionId: string) =>
    apiRequest<{
      session: import("@/types").ChatSession;
      messages: import("@/types").ChatMessage[];
    }>(`/chat/sessions/${sessionId}`),

  createSession: (repoId: string, title: string) =>
    apiRequest<import("@/types").ChatSession>("/chat/sessions", {
      method: "POST",
      body: { repo_id: repoId, title },
    }),

  sendMessage: (sessionId: string, content: string, signal?: AbortSignal) =>
    apiRequest<import("@/types").ChatMessage>(`/chat/sessions/${sessionId}/messages`, {
      method: "POST",
      body: { content },
      signal,
    }),
};

// ==================== Navigation API ====================
export const navApi = {
  goToDefinition: (repoId: string, symbol: string) =>
    apiRequest<{ definitions: import("@/types").DefinitionResult[] }>(
      `/navigate/${repoId}/definition`,
      { method: "POST", body: { symbol } }
    ),

  findReferences: (repoId: string, nodeId: string) =>
    apiRequest<{ references: import("@/types").ReferenceResult[] }>(
      `/navigate/${repoId}/references/${nodeId}`
    ),
};

// ==================== Impact Analysis API ====================
export const impactApi = {
  analyze: (repoId: string, nodeId: string) =>
    apiRequest<import("@/types").ImpactResult>(`/impact/${repoId}/analyze/${nodeId}`),

  analyzeFile: (repoId: string, filePath: string) =>
    apiRequest<import("@/types").ImpactResult>(`/impact/${repoId}/analyze-file`, {
      method: "POST",
      body: { file_path: filePath },
    }),
};

// ==================== Review API ====================
export const reviewApi = {
  review: (params: import("@/types").ReviewRequest) =>
    apiRequest<import("@/types").ReviewResult>("/review", {
      method: "POST",
      body: params,
    }),
};

// ==================== Documentation API ====================
export const docsApi = {
  generate: (params: import("@/types").DocGenerationRequest) =>
    apiRequest<import("@/types").GeneratedDoc>("/docs/generate", {
      method: "POST",
      body: params,
    }),
};

// ==================== Onboarding API ====================
export const onboardingApi = {
  generate: (repoId: string) =>
    apiRequest<import("@/types").OnboardingGuide>(`/onboarding/${repoId}/generate`, {
      method: "POST",
    }),

  get: (repoId: string) =>
    apiRequest<import("@/types").OnboardingGuide>(`/onboarding/${repoId}`),
};
