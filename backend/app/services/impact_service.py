"""Impact analysis service — determines what breaks when code changes."""

from app.core.database import get_supabase
from app.core.embeddings import generate_chat_completion
from app.models.schemas import ImpactResponse, AffectedNodeItem


def analyze_node_impact(repo_id: str, node_id: str) -> ImpactResponse:
    """Analyze the impact of changing a specific node."""
    db = get_supabase()

    # Get the target node
    target = db.table("graph_nodes").select("*").eq("id", node_id).limit(1).execute()
    if not target.data:
        raise ValueError("Node not found")

    target_node = target.data[0]

    # Use recursive CTE to find affected nodes
    affected_result = db.rpc("find_affected_nodes", {
        "p_node_id": node_id,
        "p_max_depth": 5,
    }).execute()

    affected_nodes = []
    for row in affected_result.data or []:
        # Determine risk level based on relationship and distance
        risk = "low"
        if row["depth"] == 1:
            if row["edge_kind"] in ("calls", "extends", "implements"):
                risk = "high"
            elif row["edge_kind"] in ("imports", "uses"):
                risk = "medium"
        elif row["depth"] == 2:
            if row["edge_kind"] in ("calls", "extends"):
                risk = "medium"
        # Deeper = lower risk

        impact_type = "direct" if row["depth"] == 1 else "transitive"

        reason = _generate_impact_reason(
            target_node["name"],
            row["node_name"],
            row["edge_kind"],
            row["depth"],
        )

        affected_nodes.append(AffectedNodeItem(
            node={
                "id": row["node_id"],
                "name": row["node_name"],
                "kind": row["node_kind"],
                "file_path": row["node_file_path"],
                "start_line": 0,
                "end_line": 0,
            },
            impact_type=impact_type,
            relationship=row["edge_kind"],
            distance=row["depth"],
            risk=risk,
            reason=reason,
        ))

    # Calculate overall risk score
    if not affected_nodes:
        risk_score = 0.0
    else:
        high_count = sum(1 for n in affected_nodes if n.risk == "high")
        medium_count = sum(1 for n in affected_nodes if n.risk == "medium")
        total = len(affected_nodes)
        risk_score = min(1.0, (high_count * 0.3 + medium_count * 0.15 + total * 0.02))

    # Generate summary using AI
    summary = _generate_impact_summary(target_node, affected_nodes, risk_score)

    return ImpactResponse(
        target_node=target_node,
        affected_nodes=affected_nodes,
        risk_score=risk_score,
        summary=summary,
    )


def analyze_file_impact(repo_id: str, file_path: str) -> ImpactResponse:
    """Analyze impact of changing an entire file."""
    db = get_supabase()

    # Find the module node for this file
    nodes = db.table("graph_nodes").select("id, name, kind").eq(
        "repo_id", repo_id
    ).eq("file_path", file_path).eq("kind", "module").limit(1).execute()

    if not nodes.data:
        # Try any node in the file
        nodes = db.table("graph_nodes").select("id, name, kind").eq(
            "repo_id", repo_id
        ).eq("file_path", file_path).limit(1).execute()

    if not nodes.data:
        raise ValueError(f"No nodes found for file: {file_path}")

    return analyze_node_impact(repo_id, nodes.data[0]["id"])


def _generate_impact_reason(source_name: str, target_name: str, edge_kind: str, depth: int) -> str:
    """Generate a human-readable reason for the impact."""
    reasons = {
        "calls": f"`{target_name}` directly calls `{source_name}`",
        "imports": f"`{target_name}` imports `{source_name}`",
        "extends": f"`{target_name}` extends `{source_name}` - changes to the parent class will affect it",
        "implements": f"`{target_name}` implements `{source_name}` - interface changes will require updates",
        "uses": f"`{target_name}` uses `{source_name}`",
        "type_of": f"`{target_name}` has a type dependency on `{source_name}`",
        "returns": f"`{target_name}` returns `{source_name}`",
        "parameter_of": f"`{target_name}` takes `{source_name}` as a parameter",
    }

    base = reasons.get(edge_kind, f"`{target_name}` is connected to `{source_name}` via {edge_kind}")

    if depth > 1:
        base += f" (transitive, {depth} hops away)"

    return base


def _generate_impact_summary(target: dict, affected: list[AffectedNodeItem], risk_score: float) -> str:
    """Generate an AI summary of the impact analysis."""
    if not affected:
        return f"Changing `{target['name']}` appears to have no downstream impact. This symbol is either unused or only used locally."

    high = sum(1 for n in affected if n.risk == "high")
    medium = sum(1 for n in affected if n.risk == "medium")
    low = sum(1 for n in affected if n.risk == "low")

    affected_files = set(n.node.get("file_path", "") for n in affected)

    summary = (
        f"Changing `{target['name']}` ({target['kind']}) in `{target['file_path']}` "
        f"affects {len(affected)} downstream components across {len(affected_files)} files. "
    )

    if high > 0:
        summary += f"{high} components have HIGH risk of breaking. "
    if medium > 0:
        summary += f"{medium} components have MEDIUM risk. "
    if low > 0:
        summary += f"{low} components have LOW risk. "

    if risk_score > 0.7:
        summary += "This is a high-impact change - thorough testing is recommended."
    elif risk_score > 0.4:
        summary += "This is a moderate-impact change - test affected areas carefully."
    else:
        summary += "This is a low-impact change, but verify affected components."

    return summary
