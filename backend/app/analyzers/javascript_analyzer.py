import re
from typing import List, Dict, Any, Optional
from app.analyzers.base import BaseAnalyzer, AnalysisResult, ExtractedEntity, ExtractedDependency, ExtractedRule

class JavaScriptAnalyzer(BaseAnalyzer):
    SUPPORTED_EXTENSIONS = {".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"}

    def can_handle(self, file_path: str) -> bool:
        return any(file_path.endswith(ext) for ext in self.SUPPORTED_EXTENSIONS)

    def analyze(self, file_path: str, content: str, relative_path: str) -> AnalysisResult:
        result = AnalysisResult()
        lines = content.splitlines()
        
        entities: List[ExtractedEntity] = []
        dependencies: List[ExtractedDependency] = []
        rules: List[ExtractedRule] = []
        
        # Regex patterns
        import_es_re = re.compile(r'import\s+(?:\{([^}]+)\}|\*\s+as\s+([a-zA-Z0-9_]+)|([a-zA-Z0-9_]+))?\s*(?:,\s*\{([^}]+)\})?\s*from\s*[\'"]([^\'"]+)[\'"]')
        require_re = re.compile(r'(?:const|let|var)\s+(?:\{([^}]+)\}|([a-zA-Z0-9_]+))\s*=\s*require\([\'"]([^\'"]+)[\'"]\)')
        
        func_re = re.compile(r'(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)')
        arrow_func_re = re.compile(r'(?:export\s+)?(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>')
        class_re = re.compile(r'class\s+([a-zA-Z0-9_]+)(?:\s+extends\s+([a-zA-Z0-9_]+))?')
        
        route_re = re.compile(r'(?:app|router|server)\.(get|post|put|delete|patch)\s*\(\s*[\'"]([^\'"]+)[\'"]')
        test_re = re.compile(r'(?:describe|it|test)\s*\(\s*[\'"]([^\'"]+)[\'"]')
        
        # Rule detection patterns in conditionals
        cond_re = re.compile(r'if\s*\((.*)\)')
        
        for idx, line in enumerate(lines, start=1):
            s = line.strip()
            if not s or s.startswith("//") or s.startswith("/*"):
                continue

            # 1. Imports
            m_import = import_es_re.search(s)
            if m_import:
                module_target = m_import.group(5)
                entities.append(ExtractedEntity(
                    entity_type="import",
                    name=module_target,
                    file_path=relative_path,
                    line_start=idx,
                    line_end=idx
                ))
                dependencies.append(ExtractedDependency(
                    source=f"mod:{relative_path}",
                    target=f"mod:{module_target}",
                    relationship="imports",
                    evidence_type="static_ast",
                    file_path=relative_path,
                    line_number=idx
                ))
                continue

            m_req = require_re.search(s)
            if m_req:
                module_target = m_req.group(3)
                entities.append(ExtractedEntity(
                    entity_type="import",
                    name=module_target,
                    file_path=relative_path,
                    line_start=idx,
                    line_end=idx
                ))
                dependencies.append(ExtractedDependency(
                    source=f"mod:{relative_path}",
                    target=f"mod:{module_target}",
                    relationship="imports",
                    evidence_type="static_ast",
                    file_path=relative_path,
                    line_number=idx
                ))
                continue

            # 2. Routes
            m_route = route_re.search(s)
            if m_route:
                method = m_route.group(1).upper()
                path = m_route.group(2)
                endpoint_name = f"{method} {path}"
                entities.append(ExtractedEntity(
                    entity_type="endpoint",
                    name=endpoint_name,
                    file_path=relative_path,
                    line_start=idx,
                    line_end=idx,
                    details={"http_method": method, "path": path}
                ))
                dependencies.append(ExtractedDependency(
                    source=f"mod:{relative_path}",
                    target=f"endpoint:{endpoint_name}",
                    relationship="routes",
                    evidence_type="route_decorator",
                    file_path=relative_path,
                    line_number=idx
                ))

            # 3. Classes
            m_class = class_re.search(s)
            if m_class:
                cls_name = m_class.group(1)
                super_cls = m_class.group(2)
                entities.append(ExtractedEntity(
                    entity_type="class",
                    name=cls_name,
                    file_path=relative_path,
                    line_start=idx,
                    line_end=idx,
                    details={"extends": super_cls} if super_cls else {}
                ))
                if super_cls:
                    dependencies.append(ExtractedDependency(
                        source=f"class:{relative_path}:{cls_name}",
                        target=f"class:{super_cls}",
                        relationship="inherits",
                        evidence_type="static_ast",
                        file_path=relative_path,
                        line_number=idx
                    ))

            # 4. Functions
            m_func = func_re.search(s)
            if m_func:
                f_name = m_func.group(1)
                entities.append(ExtractedEntity(
                    entity_type="function",
                    name=f_name,
                    file_path=relative_path,
                    line_start=idx,
                    line_end=idx
                ))

            m_arrow = arrow_func_re.search(s)
            if m_arrow:
                f_name = m_arrow.group(1)
                entities.append(ExtractedEntity(
                    entity_type="function",
                    name=f_name,
                    file_path=relative_path,
                    line_start=idx,
                    line_end=idx
                ))

            # 5. Tests
            m_test = test_re.search(s)
            if m_test:
                test_title = m_test.group(1)
                entities.append(ExtractedEntity(
                    entity_type="test",
                    name=test_title,
                    file_path=relative_path,
                    line_start=idx,
                    line_end=idx
                ))

            # 6. Business Rule Conditionals
            m_cond = cond_re.search(s)
            if m_cond:
                condition_expr = m_cond.group(1)
                # Check for business domain keywords
                if any(kw in condition_expr.lower() for kw in [
                    "amount", "tier", "balance", "rate", "fee", "limit", "status", "days", "age",
                    "discount", "price", "role", "total", "valid", "auth", "tax", "active", "pending", "grace"
                ]) and len(condition_expr) < 150:
                    snippet = "\n".join(lines[idx-1:min(len(lines), idx+2)]).strip()
                    rule_id = f"BR-JS-{abs(hash(f'{relative_path}:{idx}:{condition_expr}')) % 10000:04d}"
                    rules.append(ExtractedRule(
                        rule_code=rule_id,
                        description=f"JavaScript logic rule: if ({condition_expr})",
                        source_file=relative_path,
                        line_start=idx,
                        line_end=min(len(lines), idx + 2),
                        evidence_quote=snippet[:250],
                        evidence_type="source_code",
                        confidence=0.86,
                        related_modules=[relative_path],
                        potential_impact=f"Controls UI or API flow based on condition ({condition_expr})"
                    ))

        result.entities = entities
        result.dependencies = dependencies
        result.rules = rules
        result.metrics = {
            "total_lines": len(lines),
            "lines_of_code": len([l for l in lines if l.strip() and not l.strip().startswith("//")]),
            "entities_count": len(entities),
            "rules_count": len(rules)
        }
        return result
