-- Enable pgvector extension
create extension if not exists vector with schema extensions;

-- ==================== Users ====================
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  github_username text,
  avatar_url text,
  github_access_token text,
  created_at timestamptz default now()
);

alter table public.users enable row level security;
create policy "Users can read own data" on public.users for select using (auth.uid() = id);
create policy "Users can update own data" on public.users for update using (auth.uid() = id);

-- ==================== Repositories ====================
create table if not exists public.repositories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  github_url text not null,
  name text not null,
  owner text not null,
  default_branch text default 'main',
  language text,
  description text,
  status text default 'pending' check (status in ('pending', 'indexing', 'indexed', 'error')),
  indexed_at timestamptz,
  file_count integer default 0,
  node_count integer default 0,
  edge_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.repositories enable row level security;
create policy "Users can manage own repos" on public.repositories for all using (auth.uid() = user_id);

-- ==================== File Nodes ====================
create table if not exists public.file_nodes (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid references public.repositories(id) on delete cascade not null,
  path text not null,
  name text not null,
  extension text not null default '',
  language text not null default 'unknown',
  content text not null default '',
  content_hash text not null default '',
  line_count integer default 0,
  size_bytes integer default 0,
  embedding vector(1536),
  created_at timestamptz default now(),
  unique(repo_id, path)
);

create index idx_file_nodes_repo on public.file_nodes(repo_id);
create index idx_file_nodes_embedding on public.file_nodes using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ==================== Graph Nodes ====================
create table if not exists public.graph_nodes (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid references public.repositories(id) on delete cascade not null,
  file_id uuid references public.file_nodes(id) on delete cascade not null,
  name text not null,
  qualified_name text not null,
  kind text not null check (kind in (
    'module', 'class', 'function', 'method', 'variable', 'constant',
    'interface', 'type', 'enum', 'import', 'export', 'component', 'hook', 'route', 'middleware'
  )),
  start_line integer not null default 0,
  end_line integer not null default 0,
  file_path text not null,
  signature text,
  docstring text,
  embedding vector(1536),
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index idx_graph_nodes_repo on public.graph_nodes(repo_id);
create index idx_graph_nodes_file on public.graph_nodes(file_id);
create index idx_graph_nodes_kind on public.graph_nodes(kind);
create index idx_graph_nodes_name on public.graph_nodes(name);
create index idx_graph_nodes_embedding on public.graph_nodes using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- ==================== Graph Edges ====================
create table if not exists public.graph_edges (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid references public.repositories(id) on delete cascade not null,
  source_id uuid references public.graph_nodes(id) on delete cascade not null,
  target_id uuid references public.graph_nodes(id) on delete cascade not null,
  kind text not null check (kind in (
    'imports', 'calls', 'extends', 'implements', 'uses', 'defines',
    'exports', 'overrides', 'type_of', 'returns', 'parameter_of', 'contains'
  )),
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

create index idx_graph_edges_repo on public.graph_edges(repo_id);
create index idx_graph_edges_source on public.graph_edges(source_id);
create index idx_graph_edges_target on public.graph_edges(target_id);

-- ==================== Chat ====================
create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  repo_id uuid references public.repositories(id) on delete cascade not null,
  title text not null default 'New Chat',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.chat_sessions enable row level security;
create policy "Users can manage own sessions" on public.chat_sessions for all using (auth.uid() = user_id);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.chat_sessions(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  context_nodes text[] default '{}',
  created_at timestamptz default now()
);

create index idx_chat_messages_session on public.chat_messages(session_id);

-- ==================== Onboarding Guides ====================
create table if not exists public.onboarding_guides (
  id uuid primary key default gen_random_uuid(),
  repo_id uuid references public.repositories(id) on delete cascade not null unique,
  repo_name text not null,
  sections jsonb not null default '[]',
  generated_at timestamptz default now()
);

-- ==================== Functions ====================

-- Semantic search function
create or replace function search_graph_nodes(
  query_embedding vector(1536),
  match_repo_ids uuid[] default null,
  match_kinds text[] default null,
  match_languages text[] default null,
  match_limit integer default 20
)
returns table (
  id uuid,
  name text,
  kind text,
  file_path text,
  start_line integer,
  end_line integer,
  signature text,
  docstring text,
  repo_id uuid,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    gn.id,
    gn.name,
    gn.kind,
    gn.file_path,
    gn.start_line,
    gn.end_line,
    gn.signature,
    gn.docstring,
    gn.repo_id,
    1 - (gn.embedding <=> query_embedding) as similarity
  from public.graph_nodes gn
  join public.file_nodes fn on gn.file_id = fn.id
  where gn.embedding is not null
    and (match_repo_ids is null or gn.repo_id = any(match_repo_ids))
    and (match_kinds is null or gn.kind = any(match_kinds))
    and (match_languages is null or fn.language = any(match_languages))
  order by gn.embedding <=> query_embedding
  limit match_limit;
end;
$$;

-- Impact analysis: find all downstream nodes
create or replace function find_affected_nodes(
  p_node_id uuid,
  p_max_depth integer default 5
)
returns table (
  node_id uuid,
  node_name text,
  node_kind text,
  node_file_path text,
  edge_kind text,
  depth integer
)
language plpgsql
as $$
begin
  return query
  with recursive affected as (
    select
      ge.target_id as node_id,
      ge.kind as edge_kind,
      1 as depth
    from public.graph_edges ge
    where ge.source_id = p_node_id

    union

    select
      ge.target_id,
      ge.kind,
      a.depth + 1
    from affected a
    join public.graph_edges ge on ge.source_id = a.node_id
    where a.depth < p_max_depth
  )
  select distinct
    gn.id as node_id,
    gn.name as node_name,
    gn.kind as node_kind,
    gn.file_path as node_file_path,
    a.edge_kind,
    a.depth
  from affected a
  join public.graph_nodes gn on gn.id = a.node_id
  order by a.depth, gn.name;
end;
$$;

-- Updated at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tr_repositories_updated_at
  before update on public.repositories
  for each row execute function update_updated_at();

create trigger tr_chat_sessions_updated_at
  before update on public.chat_sessions
  for each row execute function update_updated_at();
