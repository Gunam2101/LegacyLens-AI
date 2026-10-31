from datetime import datetime
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, ConfigDict

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = ""

class ProjectCreate(ProjectBase):
    source_type: Optional[str] = "zip"
    source_url: Optional[str] = ""
    source_branch: Optional[str] = "main"
    auth_token: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: str
    created_at: datetime
    status: str
    source_type: str
    source_url: Optional[str] = ""
    source_branch: Optional[str] = "main"
    workspace_path: Optional[str] = ""
    languages: Dict[str, Any] = {}
    frameworks: List[str] = []
    stats: Dict[str, Any] = {}
    redesign_data: Dict[str, Any] = {}

    model_config = ConfigDict(from_attributes=True)

class BusinessRuleBase(BaseModel):
    rule_code: str
    description: str
    source_file: str
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    evidence_quote: Optional[str] = ""
    evidence_type: str = "source_code"
    confidence: float = 0.85
    status: str = "inferred"
    related_modules: List[str] = []
    potential_impact: Optional[str] = ""
    conflicting_evidence: Optional[str] = None
    user_notes: Optional[str] = None

class BusinessRuleResponse(BusinessRuleBase):
    id: str
    project_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BusinessRuleStatusUpdate(BaseModel):
    status: str = Field(..., description="verified, user_confirmed, user_rejected, conflicting, inferred")
    reason: Optional[str] = "Manual review"
    user_notes: Optional[str] = None

class RuleAuditLogResponse(BaseModel):
    id: str
    rule_id: str
    project_id: str
    action: str
    previous_status: Optional[str] = None
    new_status: str
    reason: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

class CoreFeatureResponse(BaseModel):
    id: str
    project_id: str
    name: str
    description: str
    detected_type: str
    related_files: List[str] = []
    dependencies: List[str] = []
    associated_rules: List[str] = []
    risk_level: str = "medium"
    modernization_notes: Optional[str] = ""

    model_config = ConfigDict(from_attributes=True)

class DependencyNodeResponse(BaseModel):
    id: str
    node_key: str
    name: str
    node_type: str
    file_path: Optional[str] = ""
    line_number: Optional[int] = None
    risk_level: str = "low"
    details: Dict[str, Any] = {}

    model_config = ConfigDict(from_attributes=True)

class DependencyEdgeResponse(BaseModel):
    id: str
    source_key: str
    target_key: str
    relationship: str
    evidence_type: str
    file_path: Optional[str] = None
    line_number: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class DependencyGraphResponse(BaseModel):
    nodes: List[DependencyNodeResponse]
    edges: List[DependencyEdgeResponse]
    stats: Dict[str, Any] = {}

class ObsoleteFindingResponse(BaseModel):
    id: str
    project_id: str
    component_name: str
    file_path: str
    line_number: Optional[int] = None
    category: str
    confidence: float
    signals: List[str] = []
    recommendation: str
    business_impact: str

    model_config = ConfigDict(from_attributes=True)

class CodeProposalResponse(BaseModel):
    id: str
    project_id: str
    change_id: Optional[str] = "CHG-001"
    title: str
    file_path: str
    original_code: str
    proposed_code: str
    diff_content: str
    rationale: str
    affected_rules: List[str] = []
    dependencies: List[str] = []
    baseline_test_passed: Optional[bool] = None
    post_test_passed: Optional[bool] = None
    preservation_gate_status: str
    approval_status: str
    applied_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class CodeProposalApproval(BaseModel):
    approval_status: str = Field(..., description="approved, rejected, skipped, reverted")
    reason: Optional[str] = ""

class CodeProposalEdit(BaseModel):
    title: Optional[str] = None
    proposed_code: Optional[str] = None
    rationale: Optional[str] = None

class ModernizationPhase(BaseModel):
    phase_number: int
    title: str
    description: str
    target_components: List[str]
    risk_mitigation: str
    verification_steps: List[str]
    estimated_effort: str

class ModernizationRoadmapResponse(BaseModel):
    project_id: str
    phases: List[ModernizationPhase]
    recommendations: List[Dict[str, Any]]
    created_at: datetime

class EvidenceDocumentResponse(BaseModel):
    id: str
    project_id: str
    filename: str
    doc_type: str
    content: str
    summary: str
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)

class EvidenceUploadRequest(BaseModel):
    filename: str
    doc_type: str
    content: str

class TokenUsageResponse(BaseModel):
    available: bool
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0
    provider: Optional[str] = None
    model: Optional[str] = None
    models: Dict[str, Any] = {}
    calls_count: int = 0
    reason: Optional[str] = None
    last_updated: Optional[str] = None

class AnalysisEventResponse(BaseModel):
    id: str
    stage: str
    progress: int
    message: str
    level: str
    timestamp: datetime
    token_usage: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)

class VerificationResultResponse(BaseModel):
    proposal_id: Optional[str]
    baseline_passed: int
    baseline_failed: int
    post_passed: int
    post_failed: int
    regressions_detected: List[str]
    behavior_diffs: List[Dict[str, Any]]
    preservation_status: str
    execution_output: str
    duration_seconds: float

class WebsiteInspectionResponse(BaseModel):
    id: str
    project_id: str
    url: str
    status_code: int
    page_title: str
    meta_description: str
    headings: List[Dict[str, Any]] = []
    links: List[Dict[str, Any]] = []
    colors: List[str] = []
    fonts: List[str] = []
    images: List[Dict[str, Any]] = []
    forms: List[Dict[str, Any]] = []
    accessibility_issues: List[Dict[str, Any]] = []
    broken_links: List[Dict[str, Any]] = []
    visual_structure: Dict[str, Any] = {}
    redesign_prototype_html: str
    redesign_spec: Dict[str, Any] = {}
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class FileNode(BaseModel):
    name: str
    path: str
    is_dir: bool
    size: int = 0
    language: Optional[str] = None
    status: Optional[str] = "unchanged" # unchanged, modified, added, removed, affected
    children: Optional[List['FileNode']] = None

FileNode.model_rebuild()

class FileTreeResponse(BaseModel):
    project_id: str
    root: FileNode
    total_files: int
    total_directories: int

class FileContentResponse(BaseModel):
    project_id: str
    file_path: str
    original_content: str
    modernized_content: str
    is_modified: bool
