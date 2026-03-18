"""Chat service — AI conversation with codebase context."""

import json
from datetime import datetime

from app.core.database import get_supabase
from app.core.embeddings import generate_embedding, generate_chat_completion


SYSTEM_PROMPT = """You are GraphCody, an AI coding assistant that has deep understanding of a codebase through its code graph.

You have access to the following context about the codebase:
- Code graph nodes (functions, classes, modules, etc.)
- Dependencies and relationships between code symbols
- File contents and structure

When answering questions:
1. Reference specific files, functions, and classes by name
2. Explain relationships and dependencies when relevant
3. Provide code snippets when helpful
4. Be precise about line numbers and file paths
5. Suggest improvements when appropriate

If you don't have enough context to answer accurately, say so and suggest what additional information would help."""


def create_session(user_id: str, repo_id: str, title: str) -> dict:
    """Create a new chat session."""
    db = get_supabase()
    result = db.table("chat_sessions").insert({
        "user_id": user_id,
        "repo_id": repo_id,
        "title": title,
    }).execute()
    return result.data[0]


def get_session(session_id: str) -> dict:
    """Get a chat session with messages."""
    db = get_supabase()
    session = db.table("chat_sessions").select("*").eq("id", session_id).limit(1).execute()
    messages = db.table("chat_messages").select("*").eq(
        "session_id", session_id
    ).order("created_at").execute()

    return {
        "session": session.data[0] if session.data else None,
        "messages": messages.data or [],
    }


def list_sessions(repo_id: str) -> list[dict]:
    """List chat sessions for a repository."""
    db = get_supabase()
    result = db.table("chat_sessions").select("*").eq(
        "repo_id", repo_id
    ).order("updated_at", desc=True).execute()
    return result.data or []


def send_message(session_id: str, content: str) -> dict:
    """Process a user message and generate AI response."""
    db = get_supabase()

    # Get session info
    session = db.table("chat_sessions").select("repo_id").eq(
        "id", session_id
    ).limit(1).execute()

    if not session.data:
        raise ValueError("Session not found")

    repo_id = session.data[0]["repo_id"]

    # Save user message
    db.table("chat_messages").insert({
        "session_id": session_id,
        "role": "user",
        "content": content,
    }).execute()

    # Get relevant context via semantic search
    query_embedding = generate_embedding(content)

    context_result = db.rpc("search_graph_nodes", {
        "query_embedding": query_embedding,
        "match_repo_ids": [repo_id],
        "match_limit": 10,
    }).execute()

    # Build context string
    context_parts = []
    context_node_ids = []

    for node in context_result.data or []:
        context_node_ids.append(node["id"])

        # Get file content around this node
        file_result = db.table("file_nodes").select("content").eq(
            "repo_id", repo_id
        ).eq("path", node["file_path"]).limit(1).execute()

        snippet = ""
        if file_result.data:
            lines = file_result.data[0]["content"].split("\n")
            start = max(0, node["start_line"] - 1)
            end = min(len(lines), node["end_line"] + 5)
            snippet = "\n".join(f"  {i+start+1}: {l}" for i, l in enumerate(lines[start:end]))

        context_parts.append(
            f"### {node['kind']}: {node['name']}\n"
            f"File: {node['file_path']} (lines {node['start_line']}-{node['end_line']})\n"
            f"Signature: {node.get('signature', 'N/A')}\n"
            f"```\n{snippet}\n```\n"
        )

    # Get previous messages for conversation context
    prev_messages = db.table("chat_messages").select("role, content").eq(
        "session_id", session_id
    ).order("created_at").limit(20).execute()

    # Build message list
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    if context_parts:
        messages.append({
            "role": "system",
            "content": f"## Relevant Code Context\n\n{''.join(context_parts[:8])}",
        })

    for msg in prev_messages.data or []:
        if msg["role"] in ("user", "assistant"):
            messages.append({"role": msg["role"], "content": msg["content"]})

    # Generate response
    response_content = generate_chat_completion(messages, temperature=0.3, max_tokens=4096)

    # Save assistant message
    result = db.table("chat_messages").insert({
        "session_id": session_id,
        "role": "assistant",
        "content": response_content,
        "context_nodes": context_node_ids,
    }).execute()

    # Update session title if first exchange
    if len(prev_messages.data or []) <= 2:
        title = content[:60] + ("..." if len(content) > 60 else "")
        db.table("chat_sessions").update({"title": title}).eq("id", session_id).execute()

    return result.data[0]
