import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileArchive,
  FileText,
  GitBranch,
  Globe,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Loader2,
  Lock,
  ExternalLink,
  Sparkles,
  Info,
  ShieldCheck,
  FileUp
} from 'lucide-react';
import { Project } from '../types';
import { api } from '../services/api';

interface UploadPageProps {
  currentProject: Project | null;
  projects: Project[];
  onSelectProject: (p: Project) => void;
  refreshProjects: () => void;
}

export const UploadPage: React.FC<UploadPageProps> = ({
  currentProject,
  projects,
  onSelectProject,
  refreshProjects
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'url' | 'zip' | 'git' | 'evidence'>('url');

  // URL state
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [urlProjectName, setUrlProjectName] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);

  // ZIP upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [zipProjectName, setZipProjectName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);

  // Git state
  const [gitRepoUrl, setGitRepoUrl] = useState('');
  const [gitBranch, setGitBranch] = useState('main');
  const [gitToken, setGitToken] = useState('');
  const [gitProjectName, setGitProjectName] = useState('');
  const [gitLoading, setGitLoading] = useState(false);

  // Evidence state
  const [evidenceName, setEvidenceName] = useState('');
  const [evidenceType, setEvidenceType] = useState('incident_report');
  const [evidenceContent, setEvidenceContent] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceSuccess, setEvidenceSuccess] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Handle URL Onboarding
  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteUrl.trim()) {
      setErrorMsg('Please enter a website URL.');
      return;
    }

    setUrlLoading(true);
    setErrorMsg(null);
    try {
      const projName = urlProjectName.trim() || `Website: ${websiteUrl.replace(/https?:\/\//, '').split('/')[0]}`;
      const newProj = await api.createProject(
        projName,
        `Public website inspection and visual modernization for ${websiteUrl}`,
        'url',
        websiteUrl.trim()
      );
      onSelectProject(newProj);
      refreshProjects();

      // Launch live investigation pipeline
      await api.startAnalysis(newProj.id);
      navigate('/analysis');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize website inspection');
    } finally {
      setUrlLoading(false);
    }
  };

  // 2. Handle ZIP Upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.zip')) {
        setErrorMsg('Please select a valid .zip archive file.');
        return;
      }
      setSelectedFile(file);
      setErrorMsg(null);
      if (!zipProjectName) {
        setZipProjectName(file.name.replace('.zip', ''));
      }
    }
  };

  const handleZipUpload = async () => {
    if (!selectedFile) {
      setErrorMsg('Please select a ZIP file to upload.');
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    try {
      let targetProj = currentProject;
      if (!targetProj || targetProj.source_type !== 'zip') {
        const name = zipProjectName.trim() || selectedFile.name.replace('.zip', '');
        targetProj = await api.createProject(name, 'Uploaded source code ZIP archive', 'zip');
        onSelectProject(targetProj);
      }

      const res = await api.uploadZip(targetProj.id, selectedFile);
      setUploadResult(res);
      refreshProjects();

      // Auto start analysis
      await api.startAnalysis(targetProj.id);
      navigate('/analysis');
    } catch (err: any) {
      setErrorMsg(err.message || 'ZIP upload and validation failed');
    } finally {
      setUploading(false);
    }
  };

  // 3. Handle Git Repo Ingestion
  const handleGitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gitRepoUrl.trim()) {
      setErrorMsg('Please enter a Git repository URL.');
      return;
    }

    setGitLoading(true);
    setErrorMsg(null);
    try {
      const repoName = gitRepoUrl.split('/').pop()?.replace('.git', '') || 'git-repo';
      const projName = gitProjectName.trim() || `Repo: ${repoName}`;
      const newProj = await api.createProject(
        projName,
        `Git repository analysis for ${gitRepoUrl} (${gitBranch})`,
        'git',
        gitRepoUrl.trim(),
        gitBranch.trim(),
        gitToken.trim() || undefined
      );
      onSelectProject(newProj);
      refreshProjects();

      // Launch live investigation pipeline (handles shallow clone in sandbox)
      await api.startAnalysis(newProj.id);
      navigate('/analysis');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize Git repository analysis');
    } finally {
      setGitLoading(false);
    }
  };

  // 4. Handle Evidence Upload
  const handleEvidenceUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) {
      setErrorMsg('Please select or create a project first.');
      return;
    }

    try {
      await api.uploadEvidence(currentProject.id, {
        filename: evidenceName || evidenceFile?.name || 'Evidence.txt',
        doc_type: evidenceType,
        content: evidenceContent,
        file: evidenceFile || undefined
      });
      setEvidenceSuccess(true);
      setEvidenceContent('');
      setEvidenceName('');
      setEvidenceFile(null);
      setTimeout(() => setEvidenceSuccess(false), 4000);
    } catch (err: any) {
      setErrorMsg(`Evidence upload failed: ${err.message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-2 animate-fade-in">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Universal Onboarding
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
          <UploadCloud className="w-6 h-6 text-indigo-600" />
          <span>Universal Project Input Gateway</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Ingest legacy software via Website URL, Source Code ZIP, or Git Repository for autonomous AI modernization.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center gap-3 shadow-2xs">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Primary Input Segmented Control */}
      <div className="bg-slate-100/90 p-1.5 rounded-2xl flex flex-wrap gap-1 border border-slate-200/80 shadow-2xs">
        <button
          onClick={() => { setActiveTab('url'); setErrorMsg(null); }}
          className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all duration-150 ${
            activeTab === 'url'
              ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <Globe className={`w-4 h-4 ${activeTab === 'url' ? 'text-blue-600' : 'text-slate-400'}`} />
          <span>1. Website URL</span>
        </button>

        <button
          onClick={() => { setActiveTab('zip'); setErrorMsg(null); }}
          className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all duration-150 ${
            activeTab === 'zip'
              ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <FileArchive className={`w-4 h-4 ${activeTab === 'zip' ? 'text-emerald-600' : 'text-slate-400'}`} />
          <span>2. Source ZIP</span>
        </button>

        <button
          onClick={() => { setActiveTab('git'); setErrorMsg(null); }}
          className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all duration-150 ${
            activeTab === 'git'
              ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <GitBranch className={`w-4 h-4 ${activeTab === 'git' ? 'text-purple-600' : 'text-slate-400'}`} />
          <span>3. Git Repository</span>
        </button>

        <button
          onClick={() => { setActiveTab('evidence'); setErrorMsg(null); }}
          className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all duration-150 ${
            activeTab === 'evidence'
              ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-slate-200/80'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          <FileText className={`w-4 h-4 ${activeTab === 'evidence' ? 'text-amber-600' : 'text-slate-400'}`} />
          <span>4. Incident Evidence</span>
        </button>
      </div>

      {/* TAB 1: WEBSITE URL */}
      {activeTab === 'url' && (
        <form onSubmit={handleUrlSubmit} className="bg-white p-6 rounded-3xl border border-slate-200/90 space-y-5 shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-600" />
              <span>Inspect Public Website & Synthesize Redesign Prototype</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Enter any publicly accessible website URL. LegacyLens inspects the DOM, visual hierarchy, typography, colors, and accessibility, generating a modernized Tailwind redesign prototype.
            </p>
          </div>

          {/* Honest Boundary Notice */}
          <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-xs text-amber-900 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 text-amber-800">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Scope & Architecture Boundary Notice</span>
            </div>
            <p className="text-[11px] text-amber-800/90 leading-relaxed">
              Website URL inspection evaluates browser-rendered client markup, CSS tokens, assets, and HTTP headers. Backend business logic, private APIs, and SQL schemas cannot be discovered through rendered HTML and are neither simulated nor guessed.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Website Public URL *
              </label>
              <div className="relative">
                <input
                  type="url"
                  required
                  placeholder="https://example.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full text-xs p-3 pl-9 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-mono transition-all"
                />
                <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Protected by SSRF security filtering: Blocks private subnets, localhost, and cloud metadata (169.254.x).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Project Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Modernized Corporate Portal"
                value={urlProjectName}
                onChange={(e) => setUrlProjectName(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>WCAG 2.1 AA audit & responsive prototype generated automatically</span>
            </span>

            <button
              type="submit"
              disabled={urlLoading || !websiteUrl.trim()}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:bg-slate-300 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {urlLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validating & Crawling...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Inspect Website & Launch Analysis</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: ZIP ARCHIVE */}
      {activeTab === 'zip' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 space-y-5 shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileArchive className="w-5 h-5 text-emerald-600" />
              <span>Upload Source Code ZIP Archive</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Upload multi-language legacy codebases (Python, JavaScript/TypeScript, SQL, Java, React, HTML/CSS). Original files are kept read-only in an isolated sandbox.
            </p>
          </div>

          <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/20 rounded-2xl p-8 text-center transition-all cursor-pointer group">
            <input
              type="file"
              id="zip-input"
              accept=".zip"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="zip-input" className="cursor-pointer space-y-3 block">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 group-hover:bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs transition-colors">
                <FileArchive className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-800">
                  {selectedFile ? selectedFile.name : 'Click to select or drag & drop ZIP archive'}
                </div>
                <p className="text-xs text-slate-500">
                  {selectedFile
                    ? `Size: ${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                    : 'Supported: Python, TypeScript/JavaScript, SQL, Java, HTML, CSS, configs'}
                </p>
              </div>
              <div className="text-[11px] text-slate-400">Enforces Zip-Slip validation, compression bomb defense, and 100 MB limits</div>
            </label>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Project Name (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Core Billing Subsystem"
              value={zipProjectName}
              onChange={(e) => setZipProjectName(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
            />
          </div>

          <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Safe extraction into dual source/modernized workspaces</span>
            </div>

            <button
              onClick={handleZipUpload}
              disabled={!selectedFile || uploading}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:bg-slate-300 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validating & Extracting...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload Archive & Launch Analysis</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: GIT REPOSITORY */}
      {activeTab === 'git' && (
        <form onSubmit={handleGitSubmit} className="bg-white p-6 rounded-3xl border border-slate-200/90 space-y-5 shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-purple-600" />
              <span>Connect Remote Git Repository</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Analyze public or private Git repositories (GitHub, GitLab, Bitbucket). Clones safely into an isolated sandbox branch without modifying your remote repository.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Repository HTTPS URL *
              </label>
              <div className="relative">
                <input
                  type="url"
                  required
                  placeholder="https://github.com/org/repository.git"
                  value={gitRepoUrl}
                  onChange={(e) => setGitRepoUrl(e.target.value)}
                  className="w-full text-xs p-3 pl-9 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-mono transition-all"
                />
                <GitBranch className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Branch / Ref (Default: main)
                </label>
                <input
                  type="text"
                  placeholder="main"
                  value={gitBranch}
                  onChange={(e) => setGitBranch(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-mono transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Project Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Payments Gateway"
                  value={gitProjectName}
                  onChange={(e) => setGitProjectName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Personal Access Token / Fine-Grained PAT (Optional for private repos)</span>
              </label>
              <input
                type="password"
                placeholder="ghp_************************************"
                value={gitToken}
                onChange={(e) => setGitToken(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-mono transition-all"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Tokens are handled strictly in memory during clone and scrubbed immediately. Never stored in database or logged.
              </p>
            </div>
          </div>

          <div className="pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
            <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Shallow clone (--depth 1) in isolated sandbox</span>
            </span>

            <button
              type="submit"
              disabled={gitLoading || !gitRepoUrl.trim()}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:bg-slate-300 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {gitLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Cloning & Inspecting...</span>
                </>
              ) : (
                <>
                  <GitBranch className="w-4 h-4" />
                  <span>Clone & Launch Analysis</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: INCIDENT & POLICY EVIDENCE */}
      {activeTab === 'evidence' && (
        <form onSubmit={handleEvidenceUpload} className="bg-white p-6 rounded-3xl border border-slate-200/90 space-y-4 shadow-2xs">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-600" />
              <span>Upload Incident Report or Business Specification</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Provide production post-mortems (INC-4092), change tickets, or corporate charters. The agent cross-correlates these documents against code ASTs to detect conflicting business rules and protect critical compliance logic.
            </p>
          </div>

          {evidenceSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center gap-2.5 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Evidence document attached to project. Replanning engine will correlate findings!</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Document Identifier *</label>
              <input
                type="text"
                placeholder="e.g. INC-4092-weekend-settlement.txt"
                value={evidenceName}
                onChange={(e) => setEvidenceName(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-mono transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Evidence Type</label>
              <select
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 bg-white transition-all cursor-pointer"
              >
                <option value="incident_report">Production Incident Report (Post-Mortem)</option>
                <option value="change_ticket">Change Request Ticket (CR / Jira)</option>
                <option value="policy">Corporate Policy / Compliance Mandate</option>
                <option value="documentation">Architecture & Requirements Spec</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Document Content / Text</label>
            <textarea
              rows={6}
              placeholder="Paste incident findings, root cause analysis, or policy requirements here..."
              value={evidenceContent}
              onChange={(e) => setEvidenceContent(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 font-mono transition-all"
            />
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={!evidenceContent.trim() && !evidenceFile}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 disabled:bg-slate-300 shadow-sm shadow-indigo-600/25 transition-all"
            >
              Attach Evidence Document
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
