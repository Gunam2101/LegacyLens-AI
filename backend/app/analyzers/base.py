from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
from pydantic import BaseModel

class ExtractedEntity(BaseModel):
    entity_type: str # class, function, method, endpoint, table, query, import
    name: str
    file_path: str
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    docstring: Optional[str] = None
    details: Dict[str, Any] = {}

class ExtractedRule(BaseModel):
    rule_code: str
    description: str
    source_file: str
    line_start: Optional[int] = None
    line_end: Optional[int] = None
    evidence_quote: str
    evidence_type: str # source_code, sql_query, test_assertion, config
    confidence: float
    related_modules: List[str] = []
    potential_impact: str
    rule_category: str = "business_logic"

class ExtractedDependency(BaseModel):
    source: str
    target: str
    relationship: str # imports, calls, queries, routes, tests
    evidence_type: str # static_ast, sql_parse, route_decorator, inferred
    file_path: str
    line_number: Optional[int] = None

class AnalysisResult(BaseModel):
    entities: List[ExtractedEntity] = []
    dependencies: List[ExtractedDependency] = []
    rules: List[ExtractedRule] = []
    features: List[Dict[str, Any]] = []
    metrics: Dict[str, Any] = {}

class BaseAnalyzer(ABC):
    @abstractmethod
    def can_handle(self, file_path: str) -> bool:
        pass
        
    @abstractmethod
    def analyze(self, file_path: str, content: str, relative_path: str) -> AnalysisResult:
        pass
