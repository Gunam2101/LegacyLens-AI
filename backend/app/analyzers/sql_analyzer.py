import re
from typing import List, Dict, Any, Optional
import sqlglot
from sqlglot import exp
from app.analyzers.base import BaseAnalyzer, AnalysisResult, ExtractedEntity, ExtractedDependency, ExtractedRule

class SQLAnalyzer(BaseAnalyzer):
    SUPPORTED_EXTENSIONS = {".sql", ".ddl", ".dml"}

    def can_handle(self, file_path: str) -> bool:
        return any(file_path.endswith(ext) for ext in self.SUPPORTED_EXTENSIONS)

    def analyze(self, file_path: str, content: str, relative_path: str) -> AnalysisResult:
        result = AnalysisResult()
        lines = content.splitlines()
        entities: List[ExtractedEntity] = []
        dependencies: List[ExtractedDependency] = []
        rules: List[ExtractedRule] = []

        # 1. Parse using SQLGlot
        try:
            expressions = sqlglot.parse(content)
            for expr in expressions:
                if not expr:
                    continue

                # CREATE TABLE
                if isinstance(expr, exp.Create):
                    tbl = expr.find(exp.Table)
                    table_name = tbl.name if tbl else (expr.this.name if hasattr(expr.this, "name") else str(expr.this))
                    entities.append(ExtractedEntity(
                        entity_type="table",
                        name=table_name,
                        file_path=relative_path,
                        line_start=1,
                        line_end=len(lines),
                        details={"schema_definition": True}
                    ))
                    # Check constraints at table and column levels
                    for check in expr.find_all(exp.Constraint, exp.CheckColumnConstraint, exp.Check):
                        c_str = str(check)
                        if "CHECK" in c_str.upper() or isinstance(check, exp.CheckColumnConstraint):
                            rules.append(ExtractedRule(
                                rule_code=f"BR-SQL-CHK-{abs(hash(f'{relative_path}:{table_name}:{c_str}')) % 10000:04d}",
                                description=f"Database constraint on {table_name}: {c_str}",
                                source_file=relative_path,
                                line_start=1,
                                evidence_quote=c_str,
                                evidence_type="sql_query",
                                confidence=0.95,
                                related_modules=[relative_path],
                                potential_impact=f"Enforces database validity for {table_name}"
                            ))

                # SELECT / INSERT / UPDATE / DELETE queries
                for table in expr.find_all(exp.Table):
                    t_name = table.name
                    if t_name:
                        dependencies.append(ExtractedDependency(
                            source=f"mod:{relative_path}",
                            target=f"table:{t_name}",
                            relationship="queries",
                            evidence_type="sql_parse",
                            file_path=relative_path,
                            line_number=1
                        ))

                # WHERE clauses - business rules in queries
                for where in expr.find_all(exp.Where):
                    where_sql = str(where)
                    if any(term in where_sql.lower() for term in ["status", "active", "amount", "limit", "tier", "deleted", "is_"]):
                        rules.append(ExtractedRule(
                            rule_code=f"BR-SQL-WHR-{abs(hash(f'{relative_path}:{where_sql[:50]}')) % 10000:04d}",
                            description=f"Database query filter rule: {where_sql[:120]}",
                            source_file=relative_path,
                            line_start=1,
                            evidence_quote=where_sql[:200],
                            evidence_type="sql_query",
                            confidence=0.90,
                            related_modules=[relative_path],
                            potential_impact="Filters records according to active business criteria"
                        ))

        except Exception as e:
            # Fallback regex if dialect specific syntax isn't fully parsed by sqlglot
            self._fallback_sql_regex(content, relative_path, entities, dependencies, rules)

        result.entities = entities
        result.dependencies = dependencies
        result.rules = rules
        result.metrics = {
            "total_lines": len(lines),
            "lines_of_code": len([l for l in lines if l.strip() and not l.strip().startswith("--")]),
            "tables_found": len([e for e in entities if e.entity_type == "table"]),
            "rules_count": len(rules)
        }
        return result

    def _fallback_sql_regex(self, content: str, relative_path: str, entities, dependencies, rules):
        lines = content.splitlines()
        for idx, line in enumerate(lines, start=1):
            s = line.strip()
            # Match CREATE TABLE
            m_create = re.search(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)', s, re.IGNORECASE)
            if m_create:
                t_name = m_create.group(1)
                entities.append(ExtractedEntity(
                    entity_type="table",
                    name=t_name,
                    file_path=relative_path,
                    line_start=idx,
                    line_end=idx
                ))
            # Match WHERE filters
            if "WHERE" in s.upper():
                rules.append(ExtractedRule(
                    rule_code=f"BR-SQL-WHR-{abs(hash(f'{relative_path}:{idx}')) % 10000:04d}",
                    description=f"SQL predicate filter: {s}",
                    source_file=relative_path,
                    line_start=idx,
                    line_end=idx,
                    evidence_quote=s,
                    evidence_type="sql_query",
                    confidence=0.88,
                    related_modules=[relative_path],
                    potential_impact="Filters database rows by business criteria"
                ))
