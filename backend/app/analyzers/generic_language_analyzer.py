import re
from typing import List, Dict, Any, Optional
from app.analyzers.base import BaseAnalyzer, AnalysisResult, ExtractedEntity, ExtractedDependency, ExtractedRule

class GenericLanguageAnalyzer(BaseAnalyzer):
    """
    Structural AST/regex analyzer for enterprise legacy and backend languages
    including Java, C#, Go, PHP, Kotlin, and Rust.
    """
    SUPPORTED_EXTENSIONS = {".java", ".cs", ".go", ".php", ".kt", ".rs"}

    def can_handle(self, file_path: str) -> bool:
        return any(file_path.endswith(ext) for ext in self.SUPPORTED_EXTENSIONS)

    def analyze(self, file_path: str, content: str, relative_path: str) -> AnalysisResult:
        result = AnalysisResult()
        lines = content.splitlines()

        entities: List[ExtractedEntity] = []
        dependencies: List[ExtractedDependency] = []
        rules: List[ExtractedRule] = []

        # Patterns for Classes & Interfaces
        class_re = re.compile(r'(?:public|private|protected|internal)?\s*(?:static\s+)?(?:class|interface|struct|enum)\s+([a-zA-Z0-9_]+)')
        # Functions / Methods
        method_re = re.compile(r'(?:public|private|protected)?\s*(?:static\s+)?(?:[a-zA-Z0-9_<>[\]]+)\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*(?:throws\s+[^{]+)?\{')
        # Imports / Packages
        import_re = re.compile(r'(?:import|using|use|package)\s+([a-zA-Z0-9_.*]+);?')
        # Route annotations (Spring Boot @GetMapping, @PostMapping, ASP.NET [HttpGet], etc.)
        annotation_route_re = re.compile(r'@(?:Get|Post|Put|Delete|Patch|Request)Mapping\s*\(\s*(?:value\s*=\s*)?["\']([^"\']+)["\']')
        # Conditionals
        cond_re = re.compile(r'if\s*\(([^)]+)\)')

        rule_counter = 1

        for idx, line in enumerate(lines, start=1):
            s = line.strip()
            if not s or s.startswith("//") or s.startswith("/*") or s.startswith("*"):
                continue

            # Imports
            m_imp = import_re.match(s)
            if m_imp:
                pkg = m_imp.group(1)
                entities.append(ExtractedEntity(
                    entity_type="import",
                    name=pkg,
                    file_path=relative_path,
                    line_start=idx,
                    line_end=idx
                ))
                dependencies.append(ExtractedDependency(
                    source=f"mod:{relative_path}",
                    target=f"pkg:{pkg}",
                    relationship="imports",
                    evidence_type="static_ast",
                    file_path=relative_path,
                    line_number=idx
                ))

            # Classes
            m_cls = class_re.search(s)
            if m_cls:
                cls_name = m_cls.group(1)
                entities.append(ExtractedEntity(
                    entity_type="class",
                    name=cls_name,
                    file_path=relative_path,
                    line_start=idx,
                    line_end=idx
                ))

            # Methods
            m_meth = method_re.search(s)
            if m_meth and not m_meth.group(1).startswith("if"):
                m_name = m_meth.group(1)
                entities.append(ExtractedEntity(
                    entity_type="method",
                    name=m_name,
                    file_path=relative_path,
                    line_start=idx,
                    line_end=idx
                ))

            # API Routes
            m_route = annotation_route_re.search(s)
            if m_route:
                path = m_route.group(1)
                entities.append(ExtractedEntity(
                    entity_type="endpoint",
                    name=path,
                    file_path=relative_path,
                    line_start=idx,
                    line_end=idx
                ))
                dependencies.append(ExtractedDependency(
                    source=f"mod:{relative_path}",
                    target=f"api:{path}",
                    relationship="routes",
                    evidence_type="route_decorator",
                    file_path=relative_path,
                    line_number=idx
                ))

            # Business Rules
            m_cond = cond_re.search(s)
            if m_cond:
                pred = m_cond.group(1).strip()
                if any(op in pred for op in (">=", "<=", "==", "!=", "&&", "||", "contains", "equals")):
                    rules.append(ExtractedRule(
                        rule_code=f"BR-GEN-{rule_counter:03d}",
                        description=f"Branch constraint: When {pred}",
                        source_file=relative_path,
                        line_start=idx,
                        line_end=idx,
                        evidence_quote=s[:120],
                        evidence_type="source_code",
                        confidence=0.85,
                        related_modules=[relative_path],
                        potential_impact="Governs conditional execution path and boundary validation.",
                        rule_category="business_logic"
                    ))
                    rule_counter += 1

        result.entities = entities
        result.dependencies = dependencies
        result.rules = rules
        return result

