import re
from typing import List, Dict, Any, Optional
from app.analyzers.base import BaseAnalyzer, AnalysisResult, ExtractedEntity, ExtractedDependency, ExtractedRule

class WebTemplateAnalyzer(BaseAnalyzer):
    SUPPORTED_EXTENSIONS = {".html", ".htm", ".vue", ".svelte", ".jsp", ".php"}

    def can_handle(self, file_path: str) -> bool:
        return any(file_path.endswith(ext) for ext in self.SUPPORTED_EXTENSIONS)

    def analyze(self, file_path: str, content: str, relative_path: str) -> AnalysisResult:
        result = AnalysisResult()
        lines = content.splitlines()

        entities: List[ExtractedEntity] = []
        dependencies: List[ExtractedDependency] = []
        rules: List[ExtractedRule] = []

        # Find linked scripts and stylesheets
        script_src_re = re.compile(r'<script[^>]+src=[\'"]([^\'"]+)[\'"]', re.IGNORECASE)
        link_href_re = re.compile(r'<link[^>]+href=[\'"]([^\'"]+)[\'"]', re.IGNORECASE)
        form_re = re.compile(r'<form[^>]*action=[\'"]([^\'"]+)[\'"]', re.IGNORECASE)
        a11y_img_re = re.compile(r'<img\b(?![^>]*\balt=)[^>]*>', re.IGNORECASE)

        rule_idx = 1
        for idx, line in enumerate(lines, start=1):
            s = line.strip()

            # Linked scripts
            m_script = script_src_re.search(s)
            if m_script:
                src = m_script.group(1)
                entities.append(ExtractedEntity(
                    entity_type="script_include",
                    name=src,
                    file_path=relative_path,
                    line_start=idx,
                    line_end=idx
                ))
                dependencies.append(ExtractedDependency(
                    source=f"view:{relative_path}",
                    target=f"script:{src}",
                    relationship="includes",
                    evidence_type="template_tag",
                    file_path=relative_path,
                    line_number=idx
                ))

            # Stylesheets
            m_link = link_href_re.search(s)
            if m_link:
                href = m_link.group(1)
                entities.append(ExtractedEntity(
                    entity_type="stylesheet",
                    name=href,
                    file_path=relative_path,
                    line_start=idx,
                    line_end=idx
                ))
                dependencies.append(ExtractedDependency(
                    source=f"view:{relative_path}",
                    target=f"css:{href}",
                    relationship="styles",
                    evidence_type="template_tag",
                    file_path=relative_path,
                    line_number=idx
                ))

            # Form submissions
            m_form = form_re.search(s)
            if m_form:
                action = m_form.group(1)
                entities.append(ExtractedEntity(
                    entity_type="form_action",
                    name=action,
                    file_path=relative_path,
                    line_start=idx,
                    line_end=idx
                ))
                dependencies.append(ExtractedDependency(
                    source=f"view:{relative_path}",
                    target=f"endpoint:{action}",
                    relationship="routes",
                    evidence_type="form_action",
                    file_path=relative_path,
                    line_number=idx
                ))

            # Accessibility violation detection
            if a11y_img_re.search(s):
                rules.append(ExtractedRule(
                    rule_code=f"BR-A11Y-{rule_idx:03d}",
                    description=f"UI Accessibility Constraint: Image element missing alternative text attribute required for screen readers (WCAG 1.1.1)",
                    source_file=relative_path,
                    line_start=idx,
                    line_end=idx,
                    evidence_quote=s[:120],
                    evidence_type="source_code",
                    confidence=0.95,
                    related_modules=[relative_path],
                    potential_impact="Inaccessible to vision-impaired users and regulatory non-compliance.",
                    rule_category="accessibility_policy"
                ))
                rule_idx += 1

        result.entities = entities
        result.dependencies = dependencies
        result.rules = rules
        return result

