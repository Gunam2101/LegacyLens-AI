export interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  status: 'created' | 'analyzing' | 'analyzed' | 'failed';
  source_type: 'zip' | 'url' | 'git' | 'sample';
  source_url?: string;
  source_branch?: string;
  workspace_path?: string;
  languages: Record<string, number>;
  frameworks: string[];
  stats: {
    file_count?: number;
    total_loc?: number;
    entrypoints?: string[];
    test_files_count?: number;
    database_files_count?: number;
    token_usage?: TokenUsage;
  };
  redesign_data?: Record<string, any>;
}

export interface BusinessRule {
  id: string;
  project_id: string;
  rule_code: string;
  description: string;
  source_file: string;
  line_start?: number;
  line_end?: number;
  evidence_quote: string;
  evidence_type: string;
  confidence: number;
  status: 'inferred' | 'verified' | 'conflicting' | 'user_confirmed' | 'user_rejected';
  related_modules: string[];
  potential_impact?: string;
  conflicting_evidence?: string;
  user_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RuleAuditLog {
  id: string;
  rule_id: string;
  project_id: string;
  action: string;
  previous_status?: string;
  new_status: string;
  reason: string;
  timestamp: string;
}

export interface CoreFeature {
  id: string;
  project_id: string;
  name: string;
  description: string;
  detected_type: 'detected' | 'inferred';
  related_files: string[];
  dependencies: string[];
  associated_rules: string[];
  risk_level: 'low' | 'medium' | 'high';
  modernization_notes?: string;
}

export interface DependencyNode {
  id: string;
  node_key: string;
  name: string;
  node_type: 'module' | 'function' | 'endpoint' | 'table' | 'test' | 'external';
  file_path?: string;
  line_number?: number;
  risk_level: 'low' | 'medium' | 'high';
  details: Record<string, any>;
}

export interface DependencyEdge {
  id: string;
  source_key: string;
  target_key: string;
  relationship: string;
  evidence_type: string;
  file_path?: string;
  line_number?: number;
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  stats: {
    total_nodes: number;
    total_edges: number;
    modules_count: number;
    functions_count: number;
    endpoints_count: number;
    tables_count: number;
    high_risk_count: number;
  };
}

export interface ObsoleteFinding {
  id: string;
  project_id: string;
  component_name: string;
  file_path: string;
  line_number?: number;
  category: 'potentially_obsolete' | 'possibly_business_critical' | 'requires_investigation' | 'verified_unused';
  confidence: number;
  signals: string[];
  recommendation: string;
  business_impact: string;
}

export interface CodeProposal {
  id: string;
  project_id: string;
  change_id?: string; // e.g. "CHG-001"
  title: string;
  file_path: string;
  original_code: string;
  proposed_code: string;
  diff_content: string;
  rationale: string;
  affected_rules: string[];
  dependencies?: string[];
  baseline_test_passed?: boolean;
  post_test_passed?: boolean;
  preservation_gate_status: 'pending' | 'passed' | 'failed' | 'blocked';
  approval_status: 'proposed' | 'under_review' | 'approved' | 'rejected' | 'applied_in_workspace' | 'verification_failed' | 'verified' | 'reverted' | 'pending';
  applied_at?: string;
  created_at: string;
}

export interface ModernizationPhase {
  phase_number: number;
  title: string;
  description: string;
  target_components: string[];
  risk_mitigation: string;
  verification_steps: string[];
  estimated_effort: string;
}

export interface ModernizationRoadmap {
  project_id: string;
  phases: ModernizationPhase[];
  recommendations: Array<{
    title: string;
    priority: string;
    impact: string;
  }>;
  created_at: string;
}

export interface TokenUsage {
  available: boolean;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  provider?: string | null;
  model?: string | null;
  models?: Record<string, {
    provider: string;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    calls: number;
  }>;
  calls_count?: number;
  reason?: string | null;
  last_updated?: string | null;
}

export interface AnalysisEvent {
  id: string;
  stage: string;
  progress: number;
  message: string;
  level: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  token_usage?: TokenUsage;
}

export interface VerificationResult {
  proposal_id?: string;
  baseline_passed: number;
  baseline_failed: number;
  post_passed: number;
  post_failed: number;
  regressions_detected: string[];
  behavior_diffs: Array<Record<string, any>>;
  preservation_status: string;
  execution_output: string;
  duration_seconds: number;
}

export interface BenchmarkMetrics {
  business_rule_recall: number;
  business_rule_precision: number;
  rules_detected_count: number;
  ground_truth_rules_count: number;
  obsolete_detection_accuracy: number;
  obsolete_false_positive_rate: number;
  evidence_traceability_score: number;
  baseline_tests_passed: number;
  baseline_tests_failed: number;
  test_suite_execution_status: string;
  replanning_trigger_verified: boolean;
  conflicting_rules_flagged: number;
  reclassified_findings_count: number;
  execution_duration_seconds: number;
  llm_cost_estimate: string;
}

export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  language?: string;
  status?: 'unchanged' | 'modified' | 'added' | 'removed' | 'affected';
  children?: FileNode[];
}

export interface FileTreeResponse {
  project_id: string;
  root: FileNode;
  total_files: number;
  total_directories: number;
}

export interface FileContentResponse {
  project_id: string;
  file_path: string;
  original_content: string;
  modernized_content: string;
  is_modified: boolean;
}

export interface WebsiteInspection {
  id: string;
  project_id: string;
  url: string;
  status_code: number;
  page_title: string;
  meta_description: string;
  headings: Array<{ level: string; text: string }>;
  links: Array<{ href: string; text: string; rel?: string }>;
  colors: string[];
  fonts: string[];
  images: Array<{ src: string; alt: string; has_alt: boolean }>;
  forms: Array<{ action: string; method: string; inputs: Array<any> }>;
  accessibility_issues: Array<{ severity: string; rule: string; description: string }>;
  broken_links: Array<any>;
  visual_structure: Record<string, any>;
  raw_html: string;
  redesign_prototype_html: string;
  redesign_spec: Record<string, any>;
  created_at: string;
}

export interface VisualRegressionResult {
  has_visual_data: boolean;
  project_id?: string;
  message?: string;
  metrics?: {
    visual_diff_status: string;
    inline_styles_eliminated: number;
    responsive_viewport_preserved: boolean;
    viewport_added: boolean;
    modern_css_tokens_introduced: number;
    interactive_elements_count: {
      original_buttons: number;
      modernized_buttons: number;
    };
    design_fidelity_score: number;
    accessibility_compliance: string;
    layout_shifts: Array<{ element: string; status: string; shift: string }>;
  };
}
