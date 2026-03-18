"""Semantic search service using pgvector."""

from app.core.database import get_supabase
from app.core.embeddings import generate_embedding
from app.models.schemas import SearchRequest, SearchResultItem


def semantic_search(request: SearchRequest) -> list[SearchResultItem]:
    """Perform semantic search using vector similarity."""
    db = get_supabase()
    query_embedding = generate_embedding(request.query)

    # Use the RPC function
    params = {
        "query_embedding": query_embedding,
        "match_limit": request.limit,
    }
    if request.repo_ids:
        params["match_repo_ids"] = request.repo_ids
    if request.kinds:
        params["match_kinds"] = [k.value for k in request.kinds]
    if request.languages:
        params["match_languages"] = request.languages

    result = db.rpc("search_graph_nodes", params).execute()

    items = []
    for row in result.data or []:
        # Get file content for snippet
        file_result = db.table("file_nodes").select("content,language").eq(
            "repo_id", row["repo_id"]
        ).eq("path", row["file_path"]).limit(1).execute()

        snippet = ""
        language = "unknown"
        if file_result.data:
            content = file_result.data[0]["content"]
            language = file_result.data[0]["language"]
            lines = content.split("\n")
            start = max(0, row["start_line"] - 1)
            end = min(len(lines), row["end_line"])
            snippet = "\n".join(lines[start:end])[:500]

        # Get repo name
        repo_result = db.table("repositories").select("name,owner").eq(
            "id", row["repo_id"]
        ).limit(1).execute()
        repo_name = f"{repo_result.data[0]['owner']}/{repo_result.data[0]['name']}" if repo_result.data else "unknown"

        items.append(SearchResultItem(
            id=row["id"],
            file_path=row["file_path"],
            name=row["name"],
            kind=row["kind"],
            snippet=snippet,
            score=row["similarity"],
            line_start=row["start_line"],
            line_end=row["end_line"],
            repo_name=repo_name,
            language=language,
        ))

    return items


def cross_repo_search(request: SearchRequest) -> list[SearchResultItem]:
    """Search across all repositories."""
    # Same as semantic search but without repo filter
    modified_request = SearchRequest(
        query=request.query,
        repo_ids=None,
        kinds=request.kinds,
        languages=request.languages,
        limit=request.limit,
    )
    return semantic_search(modified_request)


def code_search(query: str, repo_ids: list[str] | None = None) -> list[SearchResultItem]:
    """Text-based code search (fuzzy matching)."""
    db = get_supabase()

    q = db.table("graph_nodes").select(
        "id, name, kind, file_path, start_line, end_line, repo_id, signature"
    ).ilike("name", f"%{query}%").limit(50)

    if repo_ids:
        q = q.in_("repo_id", repo_ids)

    result = q.execute()
    items = []

    for row in result.data or []:
        repo_result = db.table("repositories").select("name,owner").eq(
            "id", row["repo_id"]
        ).limit(1).execute()
        repo_name = f"{repo_result.data[0]['owner']}/{repo_result.data[0]['name']}" if repo_result.data else "unknown"

        items.append(SearchResultItem(
            id=row["id"],
            file_path=row["file_path"],
            name=row["name"],
            kind=row["kind"],
            snippet=row.get("signature", ""),
            score=1.0,
            line_start=row["start_line"],
            line_end=row["end_line"],
            repo_name=repo_name,
            language="unknown",
        ))

    return items
