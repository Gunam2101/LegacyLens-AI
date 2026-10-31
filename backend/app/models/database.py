import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey, JSON, create_engine
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship as orm_relationship
from app.core.config import settings

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

def utc_now():
    return datetime.now(timezone.utc)

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=utc_now)
    status = Column(String(50), default="created")  # created, analyzing, analyzed, failed
    source_type = Column(String(50), default="zip") # zip, git, url, sample
    source_url = Column(String(1024), default="")
    source_branch = Column(String(100), default="main")
    workspace_path = Column(String(1024), default="")
    languages = Column(JSON, default=dict)
    frameworks = Column(JSON, default=list)
    stats = Column(JSON, default=dict)
    redesign_data = Column(JSON, default=dict)
    
    # Relationships
    rules = orm_relationship("BusinessRule", back_populates="project", cascade="all, delete-orphan")
    documents = orm_relationship("EvidenceDocument", back_populates="project", cascade="all, delete-orphan")
    features = orm_relationship("CoreFeature", back_populates="project", cascade="all, delete-orphan")
    dependencies_nodes = orm_relationship("DependencyNode", back_populates="project", cascade="all, delete-orphan")
    dependencies_edges = orm_relationship("DependencyEdge", back_populates="project", cascade="all, delete-orphan")
    obsolete_findings = orm_relationship("ObsoleteFinding", back_populates="project", cascade="all, delete-orphan")
    proposals = orm_relationship("CodeProposal", back_populates="project", cascade="all, delete-orphan")
    events = orm_relationship("AnalysisEvent", back_populates="project", cascade="all, delete-orphan")
    website_inspections = orm_relationship("WebsiteInspection", back_populates="project", cascade="all, delete-orphan")

class EvidenceDocument(Base):
    __tablename__ = "evidence_documents"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    doc_type = Column(String(50), default="documentation") # incident_report, change_ticket, documentation, test_spec
    content = Column(Text, nullable=False)
    summary = Column(Text, default="")
    uploaded_at = Column(DateTime, default=utc_now)
    
    project = orm_relationship("Project", back_populates="documents")

class BusinessRule(Base):
    __tablename__ = "business_rules"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    rule_code = Column(String(50), nullable=False) # e.g. BR-001
    description = Column(Text, nullable=False)
    source_file = Column(String(512), nullable=False)
    line_start = Column(Integer, nullable=True)
    line_end = Column(Integer, nullable=True)
    evidence_quote = Column(Text, default="")
    evidence_type = Column(String(50), default="source_code") # source_code, sql_query, test_assertion, config, documentation, incident_report
    confidence = Column(Float, default=0.85)
    status = Column(String(50), default="inferred") # inferred, verified, user_confirmed, user_rejected, conflicting
    related_modules = Column(JSON, default=list)
    potential_impact = Column(Text, default="")
    conflicting_evidence = Column(Text, nullable=True)
    user_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    project = orm_relationship("Project", back_populates="rules")
    audit_logs = orm_relationship("RuleAuditLog", back_populates="rule", cascade="all, delete-orphan")

class RuleAuditLog(Base):
    __tablename__ = "rule_audit_logs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    rule_id = Column(String(36), ForeignKey("business_rules.id"), nullable=False)
    project_id = Column(String(36), nullable=False)
    action = Column(String(50), nullable=False) # created, confirmed, rejected, updated, replanned
    previous_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    reason = Column(Text, default="")
    timestamp = Column(DateTime, default=utc_now)
    
    rule = orm_relationship("BusinessRule", back_populates="audit_logs")

class CoreFeature(Base):
    __tablename__ = "core_features"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    detected_type = Column(String(50), default="detected") # detected vs inferred
    related_files = Column(JSON, default=list)
    dependencies = Column(JSON, default=list)
    associated_rules = Column(JSON, default=list)
    risk_level = Column(String(20), default="medium") # low, medium, high
    modernization_notes = Column(Text, default="")
    
    project = orm_relationship("Project", back_populates="features")

class DependencyNode(Base):
    __tablename__ = "dependency_nodes"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    node_key = Column(String(255), nullable=False) # unique key e.g. "mod:billing.py"
    name = Column(String(255), nullable=False)
    node_type = Column(String(50), default="module") # module, function, api, table, config, test, external
    file_path = Column(String(512), default="")
    line_number = Column(Integer, nullable=True)
    risk_level = Column(String(20), default="low")
    details = Column(JSON, default=dict)
    
    project = orm_relationship("Project", back_populates="dependencies_nodes")

class DependencyEdge(Base):
    __tablename__ = "dependency_edges"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    source_key = Column(String(255), nullable=False)
    target_key = Column(String(255), nullable=False)
    relationship = Column(String(50), default="calls") # imports, calls, queries, routes, tests, depends_on
    evidence_type = Column(String(50), default="static_ast") # static_ast, sql_parse, route_decorator, inferred
    file_path = Column(String(512), nullable=True)
    line_number = Column(Integer, nullable=True)
    
    project = orm_relationship("Project", back_populates="dependencies_edges")

class ObsoleteFinding(Base):
    __tablename__ = "obsolete_findings"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    component_name = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    line_number = Column(Integer, nullable=True)
    category = Column(String(50), default="potentially_obsolete") # potentially_obsolete, possibly_business_critical, requires_investigation, verified_unused
    confidence = Column(Float, default=0.7)
    signals = Column(JSON, default=list) # e.g. ["no_internal_references", "deprecated_dependency"]
    recommendation = Column(Text, default="")
    business_impact = Column(Text, default="")
    
    project = orm_relationship("Project", back_populates="obsolete_findings")

class CodeProposal(Base):
    __tablename__ = "code_proposals"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    change_id = Column(String(50), nullable=True) # e.g. "CHG-001"
    title = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    original_code = Column(Text, nullable=False)
    proposed_code = Column(Text, nullable=False)
    diff_content = Column(Text, nullable=False)
    rationale = Column(Text, default="")
    affected_rules = Column(JSON, default=list)
    dependencies = Column(JSON, default=list) # Dependencies on other proposal change_ids
    baseline_test_passed = Column(Boolean, nullable=True)
    post_test_passed = Column(Boolean, nullable=True)
    preservation_gate_status = Column(String(50), default="pending") # pending, passed, failed, blocked
    approval_status = Column(String(50), default="proposed") # proposed, under_review, approved, rejected, applied_in_workspace, verification_failed, verified, reverted
    applied_at = Column(DateTime, nullable=True)
    reverted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    
    project = orm_relationship("Project", back_populates="proposals")

class WebsiteInspection(Base):
    __tablename__ = "website_inspections"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    url = Column(String(1024), nullable=False)
    status_code = Column(Integer, default=200)
    page_title = Column(String(512), default="")
    meta_description = Column(Text, default="")
    headings = Column(JSON, default=list)
    links = Column(JSON, default=list)
    colors = Column(JSON, default=list)
    fonts = Column(JSON, default=list)
    images = Column(JSON, default=list)
    forms = Column(JSON, default=list)
    accessibility_issues = Column(JSON, default=list)
    broken_links = Column(JSON, default=list)
    visual_structure = Column(JSON, default=dict)
    raw_html = Column(Text, default="")
    redesign_prototype_html = Column(Text, default="")
    redesign_spec = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utc_now)
    
    project = orm_relationship("Project", back_populates="website_inspections")

class ModernizationPlan(Base):
    __tablename__ = "modernization_plans"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), nullable=False)
    phases = Column(JSON, default=list) # Phased roadmap with Phase 1 to Phase 5
    recommendations = Column(JSON, default=list)
    created_at = Column(DateTime, default=utc_now)

class AnalysisEvent(Base):
    __tablename__ = "analysis_events"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    stage = Column(String(100), nullable=False)
    progress = Column(Integer, default=0)
    message = Column(Text, nullable=False)
    level = Column(String(20), default="info") # info, warning, error, success
    timestamp = Column(DateTime, default=utc_now)
    token_usage = Column(JSON, nullable=True, default=None)
    
    project = orm_relationship("Project", back_populates="events")

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)
    
    # Auto-migrate SQLite schema for newly added columns if existing DB
    if "sqlite" in settings.DATABASE_URL:
        from sqlalchemy import text
        with engine.connect() as conn:
            # Check projects table columns
            res = conn.execute(text("PRAGMA table_info(projects)")).fetchall()
            existing_cols = {row[1] for row in res}
            
            if "source_url" not in existing_cols:
                conn.execute(text("ALTER TABLE projects ADD COLUMN source_url VARCHAR(1024) DEFAULT ''"))
            if "source_branch" not in existing_cols:
                conn.execute(text("ALTER TABLE projects ADD COLUMN source_branch VARCHAR(100) DEFAULT 'main'"))
            if "redesign_data" not in existing_cols:
                conn.execute(text("ALTER TABLE projects ADD COLUMN redesign_data JSON DEFAULT '{}'"))
                
            # Check code_proposals table columns
            p_res = conn.execute(text("PRAGMA table_info(code_proposals)")).fetchall()
            p_cols = {row[1] for row in p_res}
            if "change_id" not in p_cols:
                conn.execute(text("ALTER TABLE code_proposals ADD COLUMN change_id VARCHAR(50) DEFAULT 'CHG-001'"))
            if "dependencies" not in p_cols:
                conn.execute(text("ALTER TABLE code_proposals ADD COLUMN dependencies JSON DEFAULT '[]'"))
            if "applied_at" not in p_cols:
                conn.execute(text("ALTER TABLE code_proposals ADD COLUMN applied_at DATETIME"))
            if "reverted_at" not in p_cols:
                conn.execute(text("ALTER TABLE code_proposals ADD COLUMN reverted_at DATETIME"))

            # Check analysis_events table columns
            e_res = conn.execute(text("PRAGMA table_info(analysis_events)")).fetchall()
            e_cols = {row[1] for row in e_res}
            if "token_usage" not in e_cols:
                conn.execute(text("ALTER TABLE analysis_events ADD COLUMN token_usage JSON DEFAULT NULL"))
                
            conn.commit()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
