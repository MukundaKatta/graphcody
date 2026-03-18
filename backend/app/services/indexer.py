"""Repository indexing service — clones repo, parses code, builds graph, generates embeddings."""

import os
import tempfile
import hashlib
from pathlib import Path
from typing import Optional

import git
from tree_sitter_languages import get_parser, get_language

from app.core.config import get_settings
from app.core.database import get_supabase
from app.core.embeddings import generate_embeddings_batch

LANGUAGE_MAP = {
    ".py": "python",
    ".js": "javascript",
    ".ts": "typescript",
    ".tsx": "tsx",
    ".jsx": "javascript",
    ".rs": "rust",
    ".go": "go",
    ".java": "java",
    ".rb": "ruby",
    ".cpp": "cpp",
    ".c": "c",
    ".h": "c",
    ".hpp": "cpp",
    ".cs": "c_sharp",
    ".swift": "swift",
    ".kt": "kotlin",
    ".php": "php",
    ".vue": "vue",
    ".svelte": "svelte",
}

# Node query patterns per language
NODE_QUERIES = {
    "python": """
        (function_definition name: (identifier) @func_name) @function
        (class_definition name: (identifier) @class_name) @class
        (import_statement) @import
        (import_from_statement) @import
        (assignment left: (identifier) @var_name) @variable
    """,
    "typescript": """
        (function_declaration name: (identifier) @func_name) @function
        (class_declaration name: (type_identifier) @class_name) @class
        (interface_declaration name: (type_identifier) @iface_name) @interface
        (type_alias_declaration name: (type_identifier) @type_name) @type_alias
        (import_statement) @import
        (export_statement) @export
        (variable_declarator name: (identifier) @var_name) @variable
        (method_definition name: (property_identifier) @method_name) @method
        (arrow_function) @arrow_function
    """,
    "javascript": """
        (function_declaration name: (identifier) @func_name) @function
        (class_declaration name: (identifier) @class_name) @class
        (import_statement) @import
        (export_statement) @export
        (variable_declarator name: (identifier) @var_name) @variable
        (method_definition name: (property_identifier) @method_name) @method
    """,
}


def clone_repository(github_url: str, branch: str = "main") -> str:
    """Clone a GitHub repository to a temporary directory."""
    tmp_dir = tempfile.mkdtemp(prefix="graphcody_")
    try:
        git.Repo.clone_from(
            github_url,
            tmp_dir,
            branch=branch,
            depth=1,
            single_branch=True,
        )
    except git.GitCommandError:
        # Try with 'master' branch
        git.Repo.clone_from(
            github_url,
            tmp_dir,
            branch="master",
            depth=1,
            single_branch=True,
        )
    return tmp_dir


def get_file_language(extension: str) -> str:
    """Map file extension to language name."""
    return LANGUAGE_MAP.get(extension, "unknown")


def parse_file_nodes(file_path: str, content: str, language: str) -> list[dict]:
    """Parse a file and extract code nodes using tree-sitter."""
    nodes = []
    ts_lang = LANGUAGE_MAP.get(f".{language}", language)

    try:
        parser = get_parser(ts_lang)
    except Exception:
        # Unsupported language, create module-level node
        nodes.append({
            "name": Path(file_path).stem,
            "qualified_name": file_path,
            "kind": "module",
            "start_line": 1,
            "end_line": content.count("\n") + 1,
            "file_path": file_path,
            "signature": None,
            "docstring": None,
        })
        return nodes

    tree = parser.parse(content.encode())
    root = tree.root_node

    # Add module node
    nodes.append({
        "name": Path(file_path).stem,
        "qualified_name": file_path,
        "kind": "module",
        "start_line": 1,
        "end_line": root.end_point[0] + 1,
        "file_path": file_path,
        "signature": None,
        "docstring": None,
    })

    # Walk the tree to find definitions
    _walk_tree(root, file_path, content, nodes, ts_lang)

    return nodes


def _walk_tree(node, file_path: str, content: str, nodes: list[dict], language: str):
    """Recursively walk the syntax tree and extract nodes."""
    node_type = node.type
    lines = content.split("\n")

    # Function/method definitions
    if node_type in ("function_definition", "function_declaration", "method_definition",
                     "arrow_function", "function_expression"):
        name = _get_child_text(node, "name", content)
        if not name and node.parent:
            name = _get_child_text(node.parent, "name", content)
        if not name:
            name = f"anonymous_{node.start_point[0]}"

        kind = "method" if node_type == "method_definition" else "function"

        # Check for React component patterns
        if name and name[0].isupper() and language in ("tsx", "javascript", "typescript"):
            kind = "component"
        if name and name.startswith("use") and language in ("tsx", "javascript", "typescript"):
            kind = "hook"

        sig = _extract_signature(node, content)
        doc = _extract_docstring(node, content, language)

        nodes.append({
            "name": name or "anonymous",
            "qualified_name": f"{file_path}::{name or 'anonymous'}",
            "kind": kind,
            "start_line": node.start_point[0] + 1,
            "end_line": node.end_point[0] + 1,
            "file_path": file_path,
            "signature": sig,
            "docstring": doc,
        })

    # Class definitions
    elif node_type in ("class_definition", "class_declaration"):
        name = _get_child_text(node, "name", content)
        nodes.append({
            "name": name or "AnonymousClass",
            "qualified_name": f"{file_path}::{name or 'AnonymousClass'}",
            "kind": "class",
            "start_line": node.start_point[0] + 1,
            "end_line": node.end_point[0] + 1,
            "file_path": file_path,
            "signature": _extract_signature(node, content),
            "docstring": _extract_docstring(node, content, language),
        })

    # Interface/type definitions
    elif node_type in ("interface_declaration", "type_alias_declaration"):
        name = _get_child_text(node, "name", content)
        kind = "interface" if "interface" in node_type else "type"
        nodes.append({
            "name": name or "AnonymousType",
            "qualified_name": f"{file_path}::{name or 'AnonymousType'}",
            "kind": kind,
            "start_line": node.start_point[0] + 1,
            "end_line": node.end_point[0] + 1,
            "file_path": file_path,
            "signature": content[node.start_byte:min(node.start_byte + 200, node.end_byte)],
            "docstring": None,
        })

    # Import statements
    elif node_type in ("import_statement", "import_from_statement"):
        text = content[node.start_byte:node.end_byte].strip()
        nodes.append({
            "name": text[:80],
            "qualified_name": f"{file_path}::import_{node.start_point[0]}",
            "kind": "import",
            "start_line": node.start_point[0] + 1,
            "end_line": node.end_point[0] + 1,
            "file_path": file_path,
            "signature": text,
            "docstring": None,
        })

    # Export statements
    elif node_type == "export_statement":
        text = content[node.start_byte:node.end_byte].strip()[:80]
        nodes.append({
            "name": text,
            "qualified_name": f"{file_path}::export_{node.start_point[0]}",
            "kind": "export",
            "start_line": node.start_point[0] + 1,
            "end_line": node.end_point[0] + 1,
            "file_path": file_path,
            "signature": text,
            "docstring": None,
        })

    # Recurse into children
    for child in node.children:
        _walk_tree(child, file_path, content, nodes, language)


def _get_child_text(node, field_name: str, content: str) -> Optional[str]:
    """Get the text of a named child node."""
    child = node.child_by_field_name(field_name)
    if child:
        return content[child.start_byte:child.end_byte]
    # Try first identifier child
    for c in node.children:
        if c.type in ("identifier", "type_identifier", "property_identifier"):
            return content[c.start_byte:c.end_byte]
    return None


def _extract_signature(node, content: str) -> Optional[str]:
    """Extract the function/class signature."""
    start = node.start_byte
    # Get first line or up to opening brace/colon
    text = content[start:min(start + 300, node.end_byte)]
    for delimiter in ("{", ":", "=>"):
        idx = text.find(delimiter)
        if idx != -1:
            text = text[:idx].strip()
            break
    return text.split("\n")[0].strip() if text else None


def _extract_docstring(node, content: str, language: str) -> Optional[str]:
    """Extract the docstring from a node."""
    # Check first child for string/comment
    for child in node.children:
        if child.type in ("string", "expression_statement", "comment", "block_comment"):
            text = content[child.start_byte:child.end_byte]
            # Clean up quotes
            for q in ('"""', "'''", '/*', '*/', '//', '"', "'"):
                text = text.replace(q, "")
            return text.strip()[:500]
    return None


def extract_edges(nodes: list[dict], content: str, file_path: str) -> list[dict]:
    """Extract edges (relationships) between nodes."""
    edges = []
    module_node = None
    node_by_name = {}

    for n in nodes:
        node_by_name[n["name"]] = n
        if n["kind"] == "module":
            module_node = n

    for n in nodes:
        # Module contains all other nodes
        if module_node and n != module_node:
            edges.append({
                "source_qualified": module_node["qualified_name"],
                "target_qualified": n["qualified_name"],
                "kind": "contains",
            })

        # Import edges
        if n["kind"] == "import":
            sig = n.get("signature", "")
            # Parse import targets
            if "from" in sig:
                parts = sig.split("import")
                if len(parts) > 1:
                    imported_names = [s.strip().split(" as ")[0] for s in parts[1].split(",")]
                    for imp_name in imported_names:
                        imp_name = imp_name.strip()
                        if imp_name in node_by_name:
                            edges.append({
                                "source_qualified": n["qualified_name"],
                                "target_qualified": node_by_name[imp_name]["qualified_name"],
                                "kind": "imports",
                            })

        # Scan function/method bodies for calls
        if n["kind"] in ("function", "method", "component", "hook"):
            start = n["start_line"] - 1
            end = n["end_line"]
            body_lines = content.split("\n")[start:end]
            body = "\n".join(body_lines)

            for other_name, other_node in node_by_name.items():
                if other_node == n:
                    continue
                if other_node["kind"] in ("import", "export", "module"):
                    continue
                # Check if this function calls the other
                if f"{other_name}(" in body:
                    edges.append({
                        "source_qualified": n["qualified_name"],
                        "target_qualified": other_node["qualified_name"],
                        "kind": "calls",
                    })

    return edges


def index_repository(repo_id: str, github_url: str, branch: str = "main"):
    """Full indexing pipeline for a repository."""
    settings = get_settings()
    db = get_supabase()

    # Update status to indexing
    db.table("repositories").update({"status": "indexing"}).eq("id", repo_id).execute()

    try:
        # Clone
        clone_dir = clone_repository(github_url, branch)

        all_file_nodes = []
        all_graph_nodes = []
        all_edges = []
        file_count = 0

        # Walk files
        for root, dirs, files in os.walk(clone_dir):
            # Skip hidden directories and common non-code directories
            dirs[:] = [d for d in dirs if not d.startswith(".") and d not in (
                "node_modules", "__pycache__", "venv", ".venv", "dist", "build",
                ".git", ".next", "vendor", "target",
            )]

            for fname in files:
                fpath = os.path.join(root, fname)
                ext = Path(fname).suffix

                if ext not in settings.supported_extensions:
                    continue

                try:
                    stat = os.stat(fpath)
                    if stat.st_size > settings.max_file_size:
                        continue

                    with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                except (OSError, UnicodeDecodeError):
                    continue

                rel_path = os.path.relpath(fpath, clone_dir)
                language = get_file_language(ext)
                content_hash = hashlib.sha256(content.encode()).hexdigest()

                # File node
                file_node = {
                    "repo_id": repo_id,
                    "path": rel_path,
                    "name": fname,
                    "extension": ext,
                    "language": language,
                    "content": content,
                    "content_hash": content_hash,
                    "line_count": content.count("\n") + 1,
                    "size_bytes": len(content.encode()),
                }
                all_file_nodes.append(file_node)

                # Parse code nodes
                parsed_nodes = parse_file_nodes(rel_path, content, language)
                all_graph_nodes.extend(parsed_nodes)

                # Extract edges within file
                file_edges = extract_edges(parsed_nodes, content, rel_path)
                all_edges.extend(file_edges)

                file_count += 1

        # Generate embeddings for file nodes (batch)
        file_texts = [
            f"File: {fn['path']}\nLanguage: {fn['language']}\n{fn['content'][:2000]}"
            for fn in all_file_nodes
        ]

        if file_texts:
            batch_size = 50
            file_embeddings = []
            for i in range(0, len(file_texts), batch_size):
                batch = file_texts[i:i + batch_size]
                file_embeddings.extend(generate_embeddings_batch(batch))

            for idx, fn in enumerate(all_file_nodes):
                fn["embedding"] = file_embeddings[idx]

        # Insert file nodes
        file_id_map = {}
        for fn in all_file_nodes:
            result = db.table("file_nodes").insert(fn).execute()
            if result.data:
                file_id_map[fn["path"]] = result.data[0]["id"]

        # Generate embeddings for graph nodes (batch)
        node_texts = [
            f"{gn['kind']}: {gn['name']}\nFile: {gn['file_path']}\n"
            f"Signature: {gn.get('signature', '')}\n"
            f"Docstring: {gn.get('docstring', '')}"
            for gn in all_graph_nodes
        ]

        if node_texts:
            batch_size = 50
            node_embeddings = []
            for i in range(0, len(node_texts), batch_size):
                batch = node_texts[i:i + batch_size]
                node_embeddings.extend(generate_embeddings_batch(batch))

            for idx, gn in enumerate(all_graph_nodes):
                gn["embedding"] = node_embeddings[idx]

        # Insert graph nodes
        node_id_map = {}  # qualified_name -> id
        for gn in all_graph_nodes:
            file_id = file_id_map.get(gn["file_path"])
            if not file_id:
                continue

            record = {
                "repo_id": repo_id,
                "file_id": file_id,
                "name": gn["name"],
                "qualified_name": gn["qualified_name"],
                "kind": gn["kind"],
                "start_line": gn["start_line"],
                "end_line": gn["end_line"],
                "file_path": gn["file_path"],
                "signature": gn.get("signature"),
                "docstring": gn.get("docstring"),
                "embedding": gn.get("embedding"),
                "metadata": {},
            }
            result = db.table("graph_nodes").insert(record).execute()
            if result.data:
                node_id_map[gn["qualified_name"]] = result.data[0]["id"]

        # Insert edges
        edge_count = 0
        for edge in all_edges:
            source_id = node_id_map.get(edge["source_qualified"])
            target_id = node_id_map.get(edge["target_qualified"])
            if source_id and target_id:
                db.table("graph_edges").insert({
                    "repo_id": repo_id,
                    "source_id": source_id,
                    "target_id": target_id,
                    "kind": edge["kind"],
                    "metadata": {},
                }).execute()
                edge_count += 1

        # Cross-file edges (imports between files)
        _build_cross_file_edges(repo_id, node_id_map, all_graph_nodes, db)

        # Update repository status
        db.table("repositories").update({
            "status": "indexed",
            "file_count": file_count,
            "node_count": len(node_id_map),
            "edge_count": edge_count,
            "indexed_at": "now()",
        }).eq("id", repo_id).execute()

        # Cleanup
        import shutil
        shutil.rmtree(clone_dir, ignore_errors=True)

    except Exception as e:
        db.table("repositories").update({
            "status": "error",
        }).eq("id", repo_id).execute()
        raise e


def _build_cross_file_edges(repo_id: str, node_id_map: dict, all_nodes: list[dict], db):
    """Build import edges between files based on import statements."""
    import_nodes = [n for n in all_nodes if n["kind"] == "import"]
    export_map = {}  # name -> qualified_name

    for n in all_nodes:
        if n["kind"] in ("function", "class", "component", "hook", "interface", "type"):
            export_map[n["name"]] = n["qualified_name"]

    for imp in import_nodes:
        sig = imp.get("signature", "")
        # Try to resolve imports to definitions
        for name, qname in export_map.items():
            if name in sig and imp["file_path"] not in qname:
                source_id = node_id_map.get(imp["qualified_name"])
                target_id = node_id_map.get(qname)
                if source_id and target_id:
                    db.table("graph_edges").insert({
                        "repo_id": repo_id,
                        "source_id": source_id,
                        "target_id": target_id,
                        "kind": "imports",
                        "metadata": {},
                    }).execute()
