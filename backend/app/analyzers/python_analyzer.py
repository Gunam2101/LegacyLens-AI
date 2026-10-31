import ast
import re
from typing import List, Dict, Any, Optional
from app.analyzers.base import BaseAnalyzer, AnalysisResult, ExtractedEntity, ExtractedDependency, ExtractedRule

class PythonASTVisitor(ast.NodeVisitor):
    def __init__(self, file_path: str, content: str, relative_path: str):
        self.file_path = file_path
        self.relative_path = relative_path
        self.lines = content.splitlines()
        self.entities: List[ExtractedEntity] = []
        self.dependencies: List[ExtractedDependency] = []
        self.rules: List[ExtractedRule] = []
        self.rule_counter = 1
        
        self.current_class: Optional[str] = None
        self.current_function: Optional[str] = None

    def _get_line_slice(self, start: int, end: int) -> str:
        s = max(0, start - 1)
        e = min(len(self.lines), end)
        return "\n".join(self.lines[s:e]).strip()

    def visit_Import(self, node: ast.Import):
        for alias in node.names:
            self.entities.append(ExtractedEntity(
                entity_type="import",
                name=alias.name,
                file_path=self.relative_path,
                line_start=node.lineno,
                line_end=node.lineno,
                details={"asname": alias.asname}
            ))
            self.dependencies.append(ExtractedDependency(
                source=f"mod:{self.relative_path}",
                target=f"mod:{alias.name}",
                relationship="imports",
                evidence_type="static_ast",
                file_path=self.relative_path,
                line_number=node.lineno
            ))
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom):
        mod = node.module or ""
        for alias in node.names:
            target_name = f"{mod}.{alias.name}" if mod else alias.name
            self.entities.append(ExtractedEntity(
                entity_type="import",
                name=target_name,
                file_path=self.relative_path,
                line_start=node.lineno,
                line_end=node.lineno,
                details={"module": mod, "name": alias.name, "level": node.level}
            ))
            self.dependencies.append(ExtractedDependency(
                source=f"mod:{self.relative_path}",
                target=f"mod:{mod}" if mod else f"mod:{alias.name}",
                relationship="imports",
                evidence_type="static_ast",
                file_path=self.relative_path,
                line_number=node.lineno
            ))
        self.generic_visit(node)

    def visit_ClassDef(self, node: ast.ClassDef):
        prev_class = self.current_class
        self.current_class = node.name
        
        doc = ast.get_docstring(node)
        self.entities.append(ExtractedEntity(
            entity_type="class",
            name=node.name,
            file_path=self.relative_path,
            line_start=node.lineno,
            line_end=getattr(node, "end_lineno", node.lineno),
            docstring=doc,
            details={"bases": [ast.unparse(b) for b in node.bases]}
        ))
        
        for base in node.bases:
            base_name = ast.unparse(base)
            self.dependencies.append(ExtractedDependency(
                source=f"class:{self.relative_path}:{node.name}",
                target=f"class:{base_name}",
                relationship="inherits",
                evidence_type="static_ast",
                file_path=self.relative_path,
                line_number=node.lineno
            ))
            
        self.generic_visit(node)
        self.current_class = prev_class

    def visit_FunctionDef(self, node: ast.FunctionDef):
        self._handle_function(node, is_async=False)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef):
        self._handle_function(node, is_async=True)

    def _handle_function(self, node, is_async: bool):
        prev_func = self.current_function
        func_name = f"{self.current_class}.{node.name}" if self.current_class else node.name
        self.current_function = func_name
        
        doc = ast.get_docstring(node)
        decorators = [ast.unparse(d) for d in node.decorator_list]
        
        # Check if API endpoint
        is_endpoint = any(re.search(r'\b(get|post|put|delete|patch|route)\b', d, re.IGNORECASE) for d in decorators)
        entity_type = "endpoint" if is_endpoint else ("test" if node.name.startswith("test_") else "function")
        
        self.entities.append(ExtractedEntity(
            entity_type=entity_type,
            name=func_name,
            file_path=self.relative_path,
            line_start=node.lineno,
            line_end=getattr(node, "end_lineno", node.lineno),
            docstring=doc,
            details={
                "is_async": is_async,
                "args": [arg.arg for arg in node.args.args],
                "decorators": decorators
            }
        ))
        
        # If docstring contains explicit business rules or compliance references
        if doc and any(keyword in doc.lower() for keyword in ["rule:", "business rule", "compliance", "policy", "requirement", "calculation"]):
            rule_id = f"BR-PY-{abs(hash(self.relative_path + func_name)) % 10000:04d}"
            self.rules.append(ExtractedRule(
                rule_code=rule_id,
                description=f"Rule documented in {func_name}: {doc.strip().splitlines()[0]}",
                source_file=self.relative_path,
                line_start=node.lineno,
                line_end=getattr(node, "end_lineno", node.lineno),
                evidence_quote=doc.strip()[:200],
                evidence_type="documentation",
                confidence=0.92,
                related_modules=[self.relative_path],
                potential_impact=f"Governs execution of {func_name}"
            ))

        self.generic_visit(node)
        self.current_function = prev_func

    def visit_Call(self, node: ast.Call):
        callee = ""
        try:
            callee = ast.unparse(node.func)
        except Exception:
            if isinstance(node.func, ast.Name):
                callee = node.func.id
            elif isinstance(node.func, ast.Attribute):
                callee = f"{ast.unparse(node.func.value)}.{node.func.attr}"
                
        if callee and self.current_function:
            source_id = f"fn:{self.relative_path}:{self.current_function}"
            self.dependencies.append(ExtractedDependency(
                source=source_id,
                target=f"fn:{callee}",
                relationship="calls",
                evidence_type="static_ast",
                file_path=self.relative_path,
                line_number=node.lineno
            ))
            
        self.generic_visit(node)

    def visit_If(self, node: ast.If):
        # Extract business rules from conditional statements that check domain logic
        try:
            test_str = ast.unparse(node.test)
            # Detect business predicates (comparisons, status checks, threshold amounts, fee calculations)
            is_rule_candidate = any(kw in test_str.lower() for kw in [
                "amount", "tier", "balance", "rate", "fee", "limit", "status", "days", "age", "discount",
                "score", "tax", "flag", "active", "valid", "approved", "role", "type", "price", "threshold",
                "exempt", "expired", "penalty", "grace"
            ]) or isinstance(node.test, ast.Compare)
            
            if is_rule_candidate and len(test_str) < 120:
                snippet = self._get_line_slice(node.lineno, min(node.lineno + 3, getattr(node, "end_lineno", node.lineno)))
                rule_id = f"BR-PY-{abs(hash(f'{self.relative_path}:{node.lineno}:{test_str}')) % 10000:04d}"
                context = f"in `{self.current_function}`" if self.current_function else f"in `{self.relative_path}`"
                
                self.rules.append(ExtractedRule(
                    rule_code=rule_id,
                    description=f"Conditional business logic {context}: when `{test_str}`",
                    source_file=self.relative_path,
                    line_start=node.lineno,
                    line_end=getattr(node, "end_lineno", node.lineno),
                    evidence_quote=snippet[:250],
                    evidence_type="source_code",
                    confidence=0.88,
                    related_modules=[self.relative_path],
                    potential_impact=f"Branches execution paths based on criteria ({test_str})"
                ))
        except Exception:
            pass
            
        self.generic_visit(node)

class PythonAnalyzer(BaseAnalyzer):
    def can_handle(self, file_path: str) -> bool:
        return file_path.endswith(".py")

    def analyze(self, file_path: str, content: str, relative_path: str) -> AnalysisResult:
        result = AnalysisResult()
        try:
            tree = ast.parse(content, filename=relative_path)
            visitor = PythonASTVisitor(file_path, content, relative_path)
            visitor.visit(tree)
            
            result.entities = visitor.entities
            result.dependencies = visitor.dependencies
            result.rules = visitor.rules
            result.metrics = {
                "lines_of_code": len([l for l in content.splitlines() if l.strip() and not l.strip().startswith("#")]),
                "total_lines": len(content.splitlines()),
                "entities_count": len(visitor.entities),
                "rules_count": len(visitor.rules)
            }
        except SyntaxError as e:
            result.metrics["syntax_error"] = str(e)
            # Fallback regex extraction if file has legacy syntax errors
            self._fallback_regex_extract(content, relative_path, result)
        except Exception as e:
            result.metrics["error"] = str(e)
            self._fallback_regex_extract(content, relative_path, result)
            
        return result

    def _fallback_regex_extract(self, content: str, relative_path: str, result: AnalysisResult):
        lines = content.splitlines()
        for idx, line in enumerate(lines, start=1):
            s = line.strip()
            if s.startswith("def "):
                m = re.match(r'def\s+([a-zA-Z0-9_]+)', s)
                if m:
                    result.entities.append(ExtractedEntity(
                        entity_type="function",
                        name=m.group(1),
                        file_path=relative_path,
                        line_start=idx,
                        line_end=idx
                    ))
            elif s.startswith("class "):
                m = re.match(r'class\s+([a-zA-Z0-9_]+)', s)
                if m:
                    result.entities.append(ExtractedEntity(
                        entity_type="class",
                        name=m.group(1),
                        file_path=relative_path,
                        line_start=idx,
                        line_end=idx
                    ))
            elif s.startswith("if ") and any(k in s.lower() for k in ["amount", "status", "tax", "fee", "rate", "limit"]):
                result.rules.append(ExtractedRule(
                    rule_code=f"BR-FALLBACK-{abs(hash(f'{relative_path}:{idx}')) % 10000:04d}",
                    description=f"Extracted logic condition: {s}",
                    source_file=relative_path,
                    line_start=idx,
                    line_end=idx + 1,
                    evidence_quote=s,
                    evidence_type="source_code",
                    confidence=0.75,
                    related_modules=[relative_path],
                    potential_impact="Business conditional branch"
                ))
