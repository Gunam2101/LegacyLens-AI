import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, ForeignKey, JSON, create_engine
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship as orm_relationship
from app.core.config import settings

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="created")  # created, analyzing, analyzed, failed
    source_type = Column(String(50), default="zip") # zip, github, sample
    workspace_path = Column(String(1024), default="")
    languages = Column(JSON, default=dict)
    frameworks = Column(JSON, default=list)
    stats = Column(JSON, default=dict)
    
    # Relationships
    rules = orm_relationship("BusinessRule", back_populates="project", cascade="all, delete-orphan")
    documents = orm_relationship("EvidenceDocument", back_populates="project", cascade="all, delete-orphan")
    features = orm_relationship("CoreFeature", back_populates="project", cascade="all, delete-orphan")
    dependencies_nodes = orm_relationship("DependencyNode", back_populates="project", cascade="all, delete-orphan")
    dependencies_edges = orm_relationship("DependencyEdge", back_populates="project", cascade="all, delete-orphan")
    obsolete_findings = orm_relationship("ObsoleteFinding", back_populates="project", cascade="all, delete-orphan")
    proposals = orm_relationship("CodeProposal", back_populates="project", cascade="all, delete-orphan")
    events = orm_relationship("AnalysisEvent", back_populates="project", cascade="all, delete-orphan")

class EvidenceDocument(Base):
    __tablename__ = "evidence_documents"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    filename = Column(String(255), nullable=False)
    doc_type = Column(String(50), default="documentation") # incident_report, change_ticket, documentation, test_spec
    content = Column(Text, nullable=False)
    summary = Column(Text, default="")
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
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
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
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
    timestamp = Column(DateTime, default=datetime.utcnow)
    
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
    title = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    original_code = Column(Text, nullable=False)
    proposed_code = Column(Text, nullable=False)
    diff_content = Column(Text, nullable=False)
    rationale = Column(Text, default="")
    affected_rules = Column(JSON, default=list)
    baseline_test_passed = Column(Boolean, nullable=True)
    post_test_passed = Column(Boolean, nullable=True)
    preservation_gate_status = Column(String(50), default="pending") # pending, passed, failed, blocked
    approval_status = Column(String(50), default="pending") # pending, approved, rejected
    created_at = Column(DateTime, default=datetime.utcnow)
    
    project = orm_relationship("Project", back_populates="proposals")

class ModernizationPlan(Base):
    __tablename__ = "modernization_plans"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), nullable=False)
    phases = Column(JSON, default=list) # Phased roadmap with Phase 1 to Phase 5
    recommendations = Column(JSON, default=list)
    created_at = Column(DateTime, default=datetime.utcnow)

class AnalysisEvent(Base):
    __tablename__ = "analysis_events"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    stage = Column(String(100), nullable=False)
    progress = Column(Integer, default=0)
    message = Column(Text, nullable=False)
    level = Column(String(20), default="info") # info, warning, error, success
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    project = orm_relationship("Project", back_populates="events")

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
