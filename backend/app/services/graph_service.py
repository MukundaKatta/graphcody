"""Code graph service — fetches and transforms graph data for visualization."""

from app.core.database import get_supabase
from app.models.schemas import GraphDataResponse, VisNode, VisEdge


def get_graph(repo_id: str, depth: int | None = None, root: str | None = None) -> GraphDataResponse:
    """Get the full graph for a repository."""
    db = get_supabase()

    nodes_result = db.table("graph_nodes").select(
        "id, name, kind, file_path, start_line, end_line"
    ).eq("repo_id", repo_id).limit(500).execute()

    edges_result = db.table("graph_edges").select(
        "source_id, target_id, kind"
    ).eq("repo_id", repo_id).limit(2000).execute()

    node_ids = {n["id"] for n in nodes_result.data or []}

    vis_nodes = []
    for n in nodes_result.data or []:
        # Determine group from file path
        parts = n["file_path"].split("/")
        group = parts[0] if len(parts) > 1 else "root"

        # Size based on line span
        size = min(max(n["end_line"] - n["start_line"], 2), 30)

        vis_nodes.append(VisNode(
            id=n["id"],
            name=n["name"],
            kind=n["kind"],
            filePath=n["file_path"],
            group=group,
            size=size,
        ))

    vis_edges = []
    for e in edges_result.data or []:
        if e["source_id"] in node_ids and e["target_id"] in node_ids:
            strength = 1.0
            if e["kind"] == "contains":
                strength = 0.3
            elif e["kind"] == "imports":
                strength = 0.7
            elif e["kind"] == "calls":
                strength = 0.9

            vis_edges.append(VisEdge(
                source=e["source_id"],
                target=e["target_id"],
                kind=e["kind"],
                strength=strength,
            ))

    return GraphDataResponse(nodes=vis_nodes, edges=vis_edges)


def get_node(node_id: str) -> dict | None:
    """Get a single graph node by ID."""
    db = get_supabase()
    result = db.table("graph_nodes").select("*").eq("id", node_id).limit(1).execute()
    return result.data[0] if result.data else None


def get_neighbors(node_id: str, depth: int = 1) -> GraphDataResponse:
    """Get neighboring nodes up to a certain depth."""
    db = get_supabase()

    # Get edges from/to this node
    outgoing = db.table("graph_edges").select(
        "source_id, target_id, kind"
    ).eq("source_id", node_id).execute()

    incoming = db.table("graph_edges").select(
        "source_id, target_id, kind"
    ).eq("target_id", node_id).execute()

    neighbor_ids = set()
    all_edges_data = []

    for e in (outgoing.data or []) + (incoming.data or []):
        neighbor_ids.add(e["source_id"])
        neighbor_ids.add(e["target_id"])
        all_edges_data.append(e)

    neighbor_ids.add(node_id)

    if depth > 1 and neighbor_ids:
        # Get second-degree connections
        for nid in list(neighbor_ids):
            if nid == node_id:
                continue
            extra_out = db.table("graph_edges").select(
                "source_id, target_id, kind"
            ).eq("source_id", nid).limit(10).execute()
            extra_in = db.table("graph_edges").select(
                "source_id, target_id, kind"
            ).eq("target_id", nid).limit(10).execute()
            for e in (extra_out.data or []) + (extra_in.data or []):
                neighbor_ids.add(e["source_id"])
                neighbor_ids.add(e["target_id"])
                all_edges_data.append(e)

    # Fetch node details
    vis_nodes = []
    for nid in neighbor_ids:
        node = db.table("graph_nodes").select(
            "id, name, kind, file_path, start_line, end_line"
        ).eq("id", nid).limit(1).execute()

        if node.data:
            n = node.data[0]
            parts = n["file_path"].split("/")
            group = parts[0] if len(parts) > 1 else "root"

            vis_nodes.append(VisNode(
                id=n["id"],
                name=n["name"],
                kind=n["kind"],
                filePath=n["file_path"],
                group=group,
                size=min(max(n["end_line"] - n["start_line"], 2), 30),
            ))

    node_id_set = {n.id for n in vis_nodes}
    vis_edges = []
    seen_edges = set()
    for e in all_edges_data:
        key = (e["source_id"], e["target_id"], e["kind"])
        if key not in seen_edges and e["source_id"] in node_id_set and e["target_id"] in node_id_set:
            seen_edges.add(key)
            vis_edges.append(VisEdge(
                source=e["source_id"],
                target=e["target_id"],
                kind=e["kind"],
                strength=0.7,
            ))

    return GraphDataResponse(nodes=vis_nodes, edges=vis_edges)


def get_dependencies(repo_id: str) -> GraphDataResponse:
    """Get dependency graph (imports only)."""
    db = get_supabase()

    edges_result = db.table("graph_edges").select(
        "source_id, target_id, kind"
    ).eq("repo_id", repo_id).eq("kind", "imports").limit(1000).execute()

    node_ids = set()
    for e in edges_result.data or []:
        node_ids.add(e["source_id"])
        node_ids.add(e["target_id"])

    vis_nodes = []
    for nid in node_ids:
        node = db.table("graph_nodes").select(
            "id, name, kind, file_path, start_line, end_line"
        ).eq("id", nid).limit(1).execute()
        if node.data:
            n = node.data[0]
            parts = n["file_path"].split("/")
            vis_nodes.append(VisNode(
                id=n["id"],
                name=n["name"],
                kind=n["kind"],
                filePath=n["file_path"],
                group=parts[0] if len(parts) > 1 else "root",
                size=8,
            ))

    vis_edges = [
        VisEdge(source=e["source_id"], target=e["target_id"], kind="imports", strength=0.8)
        for e in edges_result.data or []
    ]

    return GraphDataResponse(nodes=vis_nodes, edges=vis_edges)


def get_call_chain(node_id: str) -> GraphDataResponse:
    """Get the call chain for a node (callers and callees)."""
    db = get_supabase()

    # Outgoing calls
    callees = db.table("graph_edges").select(
        "source_id, target_id, kind"
    ).eq("source_id", node_id).eq("kind", "calls").execute()

    # Incoming calls
    callers = db.table("graph_edges").select(
        "source_id, target_id, kind"
    ).eq("target_id", node_id).eq("kind", "calls").execute()

    all_edges = (callees.data or []) + (callers.data or [])
    node_ids = {node_id}
    for e in all_edges:
        node_ids.add(e["source_id"])
        node_ids.add(e["target_id"])

    vis_nodes = []
    for nid in node_ids:
        node = db.table("graph_nodes").select(
            "id, name, kind, file_path, start_line, end_line"
        ).eq("id", nid).limit(1).execute()
        if node.data:
            n = node.data[0]
            parts = n["file_path"].split("/")
            vis_nodes.append(VisNode(
                id=n["id"],
                name=n["name"],
                kind=n["kind"],
                filePath=n["file_path"],
                group=parts[0] if len(parts) > 1 else "root",
                size=10 if nid == node_id else 6,
            ))

    vis_edges = [
        VisEdge(source=e["source_id"], target=e["target_id"], kind="calls", strength=1.0)
        for e in all_edges
    ]

    return GraphDataResponse(nodes=vis_nodes, edges=vis_edges)
