from pydantic import BaseModel
from typing import Optional
from enum import Enum


# ==================== Enums ====================
class NodeKind(str, Enum):
    MODULE = "module"
    CLASS = "class"
    FUNCTION = "function"
    METHOD = "method"
    VARIABLE = "variable"
    CONSTANT = "constant"
    INTERFACE = "interface"
    TYPE = "type"
    ENUM = "enum"
    IMPORT = "import"
    EXPORT = "export"
    COMPONENT = "component"
    HOOK = "hook"
    ROUTE = "route"
    MIDDLEWARE = "middleware"


class EdgeKind(str, Enum):
    IMPORTS = "imports"
    CALLS = "calls"
    EXTENDS = "extends"
    IMPLEMENTS = "implements"
    USES = "uses"
    DEFINES = "defines"
    EXPORTS = "exports"
    OVERRIDES = "overrides"
    TYPE_OF = "type_of"
    RETURNS = "returns"
    PARAMETER_OF = "parameter_of"
    CONTAINS = "contains"


# ==================== Request Schemas ====================
class ConnectRepoRequest(BaseModel):
    github_url: str


class SearchRequest(BaseModel):
    query: str
    repo_ids: Optional[list[str]] = None
    kinds: Optional[list[NodeKind]] = None
    languages: Optional[list[str]] = None
    limit: int = 20


class ChatMessageRequest(BaseModel):
    content: str


class CreateSessionRequest(BaseModel):
    repo_id: str
    title: str = "New Chat"


class GoToDefinitionRequest(BaseModel):
    symbol: str


class AnalyzeFileRequest(BaseModel):
    file_path: str


class ReviewRequest(BaseModel):
    repo_id: str
    file_path: str
    diff: Optional[str] = None
    content: Optional[str] = None
    focus_areas: Optional[list[str]] = None


class DocGenerationRequest(BaseModel):
    repo_id: str
    node_id: Optional[str] = None
    file_path: Optional[str] = None
    style: str = "markdown"


# ==================== Response Schemas ====================
class VisNode(BaseModel):
    id: str
    name: str
    kind: str
    filePath: str
    group: str
    size: int


class VisEdge(BaseModel):
    source: str
    target: str
    kind: str
    strength: float


class GraphDataResponse(BaseModel):
    nodes: list[VisNode]
    edges: list[VisEdge]


class SearchResultItem(BaseModel):
    id: str
    file_path: str
    name: str
    kind: str
    snippet: str
    score: float
    line_start: int
    line_end: int
    repo_name: str
    language: str


class AffectedNodeItem(BaseModel):
    node: dict
    impact_type: str
    relationship: str
    distance: int
    risk: str
    reason: str


class ImpactResponse(BaseModel):
    target_node: dict
    affected_nodes: list[AffectedNodeItem]
    risk_score: float
    summary: str


class ReviewIssueItem(BaseModel):
    line: int
    severity: str
    category: str
    message: str
    suggestion: str


class ReviewSuggestionItem(BaseModel):
    title: str
    description: str
    code_before: Optional[str] = None
    code_after: Optional[str] = None
    line_start: Optional[int] = None
    line_end: Optional[int] = None


class ReviewResponse(BaseModel):
    file_path: str
    overall_score: int
    summary: str
    issues: list[ReviewIssueItem]
    suggestions: list[ReviewSuggestionItem]


class GeneratedDocResponse(BaseModel):
    title: str
    content: str
    format: str
    related_nodes: list[str]


class OnboardingSectionItem(BaseModel):
    title: str
    content: str
    key_files: list[str]
    related_nodes: list[str]
    order: int


class OnboardingGuideResponse(BaseModel):
    repo_id: str
    repo_name: str
    sections: list[OnboardingSectionItem]
    generated_at: str


class DefinitionResultItem(BaseModel):
    node: dict
    file_path: str
    line: int
    preview: str


class ReferenceResultItem(BaseModel):
    node: dict
    file_path: str
    line: int
    context: str
    kind: str
