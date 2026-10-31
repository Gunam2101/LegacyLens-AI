export interface Project {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  status: 'created' | 'analyzing' | 'analyzed' | 'failed';
  source_type: string;
  workspace_path?: string;
  languages: Record<string, number>;
  frameworks: string[];
  stats: {
    file_count?: number;
    total_loc?: number;
    entrypoints?: string[];
    test_files_count?: number;
    database_files_count?: number;
  };
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
  title: string;
  file_path: string;
  original_code: string;
  proposed_code: string;
  diff_content: string;
  rationale: string;
  affected_rules: string[];
  baseline_test_passed?: boolean;
  post_test_passed?: boolean;
  preservation_gate_status: 'pending' | 'passed' | 'failed' | 'blocked';
  approval_status: 'pending' | 'approved' | 'rejected';
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

export interface AnalysisEvent {
  id: string;
  stage: string;
  progress: number;
  message: string;
  level: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
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
