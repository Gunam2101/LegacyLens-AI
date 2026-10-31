import {
  Project, BusinessRule, RuleAuditLog, CoreFeature, DependencyGraph,
  ObsoleteFinding, CodeProposal, ModernizationRoadmap, AnalysisEvent,
  VerificationResult, BenchmarkMetrics, FileTreeResponse, FileContentResponse,
  WebsiteInspection, VisualRegressionResult, TokenUsage
} from '../types';

const API_BASE = '/api/v1';

export const api = {
  // Projects
  async getProjects(): Promise<Project[]> {
    const res = await fetch(`${API_BASE}/projects`);
    if (!res.ok) throw new Error('Failed to fetch projects');
    return res.json();
  },

  async getProject(id: string): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects/${id}`);
    if (!res.ok) throw new Error('Failed to fetch project');
    return res.json();
  },

  async createProject(
    name: string,
    description: string = '',
    sourceType: 'zip' | 'url' | 'git' | 'sample' = 'zip',
    sourceUrl: string = '',
    sourceBranch: string = 'main',
    authToken?: string
  ): Promise<Project> {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        description,
        source_type: sourceType,
        source_url: sourceUrl,
        source_branch: sourceBranch,
        auth_token: authToken
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create project' }));
      throw new Error(err.detail || 'Failed to create project');
    }
    return res.json();
  },

  async deleteProject(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete project');
  },

  async getFileTree(projectId: string): Promise<FileTreeResponse> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/file-tree`);
    if (!res.ok) throw new Error('Failed to fetch file tree');
    return res.json();
  },

  async getFileContent(projectId: string, path: string): Promise<FileContentResponse> {
    const params = new URLSearchParams({ path });
    const res = await fetch(`${API_BASE}/projects/${projectId}/file-content?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch file content');
    return res.json();
  },

  async getWebsiteInspection(projectId: string): Promise<WebsiteInspection> {
    const res = await fetch(`${API_BASE}/projects/${projectId}/website-inspection`);
    if (!res.ok) throw new Error('No website inspection data found for this project');
    return res.json();
  },

  getPatchUrl(projectId: string): string {
    return `${API_BASE}/projects/${projectId}/patch`;
  },

  // Uploads
  async uploadZip(projectId: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/uploads/${projectId}/zip`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(err.detail || 'Upload failed');
    }
    return res.json();
  },

  async uploadEvidence(projectId: string, data: { filename?: string; doc_type: string; content?: string; file?: File }): Promise<any> {
    const formData = new FormData();
    if (data.file) formData.append('file', data.file);
    if (data.filename) formData.append('filename', data.filename);
    formData.append('doc_type', data.doc_type);
    if (data.content) formData.append('content', data.content);

    const res = await fetch(`${API_BASE}/uploads/${projectId}/evidence`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload evidence');
    return res.json();
  },

  // Analysis
  async startAnalysis(projectId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/analysis/${projectId}/start`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to start analysis');
    return res.json();
  },

  async getAnalysisEvents(projectId: string): Promise<AnalysisEvent[]> {
    const res = await fetch(`${API_BASE}/analysis/${projectId}/events`);
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
  },

  async getTokenUsage(projectId: string): Promise<TokenUsage> {
    const res = await fetch(`${API_BASE}/analysis/${projectId}/token-usage`);
    if (!res.ok) throw new Error('Failed to fetch token usage');
    return res.json();
  },

  // Business Rules
  async getBusinessRules(projectId: string, status?: string, search?: string): Promise<BusinessRule[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    const res = await fetch(`${API_BASE}/business-rules/${projectId}?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch business rules');
    return res.json();
  },

  async updateRuleStatus(ruleId: string, status: string, reason: string = '', userNotes: string = ''): Promise<BusinessRule> {
    const res = await fetch(`${API_BASE}/business-rules/rule/${ruleId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reason, user_notes: userNotes }),
    });
    if (!res.ok) throw new Error('Failed to update rule status');
    return res.json();
  },

  async getRuleAuditLogs(ruleId: string): Promise<RuleAuditLog[]> {
    const res = await fetch(`${API_BASE}/business-rules/rule/${ruleId}/audit`);
    if (!res.ok) throw new Error('Failed to fetch audit logs');
    return res.json();
  },

  // Dependencies
  async getDependencies(projectId: string, nodeType?: string, riskLevel?: string): Promise<DependencyGraph> {
    const params = new URLSearchParams();
    if (nodeType) params.append('node_type', nodeType);
    if (riskLevel) params.append('risk_level', riskLevel);
    const res = await fetch(`${API_BASE}/dependencies/${projectId}?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch dependencies');
    return res.json();
  },

  // Modernization & Change Control
  async getRoadmap(projectId: string): Promise<ModernizationRoadmap> {
    const res = await fetch(`${API_BASE}/modernization/${projectId}/roadmap`);
    if (!res.ok) throw new Error('Failed to fetch roadmap');
    return res.json();
  },

  async getCoreFeatures(projectId: string): Promise<CoreFeature[]> {
    const res = await fetch(`${API_BASE}/modernization/${projectId}/features`);
    if (!res.ok) throw new Error('Failed to fetch core features');
    return res.json();
  },

  async getObsoleteFindings(projectId: string): Promise<ObsoleteFinding[]> {
    const res = await fetch(`${API_BASE}/modernization/${projectId}/obsolete`);
    if (!res.ok) throw new Error('Failed to fetch obsolete findings');
    return res.json();
  },

  async getCodeProposals(projectId: string): Promise<CodeProposal[]> {
    const res = await fetch(`${API_BASE}/modernization/${projectId}/proposals`);
    if (!res.ok) throw new Error('Failed to fetch code proposals');
    return res.json();
  },

  async updateProposalStatus(
    proposalId: string,
    approvalStatus: 'proposed' | 'under_review' | 'approved' | 'rejected' | 'skipped' | 'reverted',
    reason: string = ''
  ): Promise<CodeProposal> {
    const res = await fetch(`${API_BASE}/modernization/proposal/${proposalId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approval_status: approvalStatus, reason }),
    });
    if (!res.ok) throw new Error('Failed to update proposal status');
    return res.json();
  },

  async revertProposal(proposalId: string): Promise<CodeProposal> {
    const res = await fetch(`${API_BASE}/modernization/proposal/${proposalId}/revert`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to revert proposal');
    return res.json();
  },

  async editProposal(proposalId: string, data: { title?: string; proposed_code?: string; rationale?: string }): Promise<CodeProposal> {
    const res = await fetch(`${API_BASE}/modernization/proposal/${proposalId}/edit`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to edit proposal');
    return res.json();
  },

  async applyApprovedProposals(projectId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/modernization/${projectId}/apply-approved`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to apply approved proposals');
    return res.json();
  },

  async rollbackAllProposals(projectId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/modernization/${projectId}/rollback-all`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to rollback proposals');
    return res.json();
  },

  // Verification Gate
  async runVerification(projectId: string): Promise<VerificationResult> {
    const res = await fetch(`${API_BASE}/verification/${projectId}/run`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to execute verification gate');
    return res.json();
  },

  async getVisualRegression(projectId: string): Promise<VisualRegressionResult> {
    const res = await fetch(`${API_BASE}/verification/${projectId}/visual-regression`);
    if (!res.ok) throw new Error('Failed to fetch visual regression analysis');
    return res.json();
  },

  // Replanning
  async triggerQuickReplanning(projectId: string, filename: string, content: string, docType: string = 'incident_report'): Promise<any> {
    const res = await fetch(`${API_BASE}/replanning/${projectId}/quick-evidence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, content, doc_type: docType }),
    });
    if (!res.ok) throw new Error('Replanning failed');
    return res.json();
  },

  // Reports
  async getReportData(projectId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/reports/${projectId}/data`);
    if (!res.ok) throw new Error('Failed to fetch report data');
    return res.json();
  },

  getReportMarkdownUrl(projectId: string): string {
    return `${API_BASE}/reports/${projectId}/markdown`;
  },

  getReportHtmlUrl(projectId: string): string {
    return `${API_BASE}/reports/${projectId}/html`;
  },

  // Synthetic Benchmark
  async runSyntheticBenchmark(): Promise<{ status: string; benchmark_id: string; metrics: BenchmarkMetrics; ground_truth_verification: Record<string, boolean> }> {
    const res = await fetch(`${API_BASE}/benchmark/run-synthetic`, { method: 'POST' });
    if (!res.ok) throw new Error('Benchmark execution failed');
    return res.json();
  },

  // Settings
  async getSettings(): Promise<any> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(settingsData: any): Promise<any> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settingsData),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  }
};
