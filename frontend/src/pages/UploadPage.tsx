import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileArchive,
  FileText,
  Database,
  GitBranch,
  Globe,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Loader2
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
  const [activeTab, setActiveTab] = useState<'zip' | 'evidence' | 'sql' | 'github' | 'url'>('zip');
  
  // ZIP upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Evidence state
  const [evidenceName, setEvidenceName] = useState('');
  const [evidenceType, setEvidenceType] = useState('incident_report');
  const [evidenceContent, setEvidenceContent] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidenceSuccess, setEvidenceSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.name.endsWith('.zip')) {
        setErrorMsg('Please select a valid .zip archive file.');
        return;
      }
      setSelectedFile(file);
      setErrorMsg(null);
    }
  };

  const handleZipUpload = async () => {
    if (!currentProject) {
      setErrorMsg('Please select or create a project first.');
      return;
    }
    if (!selectedFile) {
      setErrorMsg('Please select a ZIP file to upload.');
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    try {
      const res = await api.uploadZip(currentProject.id, selectedFile);
      setUploadResult(res);
      refreshProjects();
    } catch (err: any) {
      setErrorMsg(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

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

  const handleStartAnalysis = async () => {
    if (!currentProject) return;
    try {
      await api.startAnalysis(currentProject.id);
      navigate('/analysis');
    } catch (err: any) {
      alert(`Could not start analysis: ${err.message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-2">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <UploadCloud className="w-6 h-6 text-indigo-600" />
          Application & Evidence Ingestion
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Upload legacy source code archives and domain evidence for zero-prompt AI investigation.
        </p>
      </div>

      {/* Active Project Card */}
      {!currentProject ? (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>No active project selected. Select a project or create one to upload files.</span>
          </div>
          <button
            onClick={() => navigate('/projects')}
            className="px-3 py-1 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700"
          >
            Go to Projects
          </button>
        </div>
      ) : (
        <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Target Workspace</span>
            <span className="font-semibold text-slate-900 text-sm">{currentProject.name}</span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">Workspace Status</span>
            <span className="font-medium text-slate-700 capitalize">{currentProject.status}</span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('zip')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'zip'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileArchive className="w-4 h-4" />
          <span>ZIP Archive</span>
        </button>

        <button
          onClick={() => setActiveTab('evidence')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'evidence'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Incident & Policy Evidence</span>
        </button>

        <button
          onClick={() => setActiveTab('sql')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'sql'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Database & SQL</span>
        </button>

        <button
          onClick={() => setActiveTab('github')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'github'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <GitBranch className="w-4 h-4" />
          <span>GitHub Integration</span>
        </button>

        <button
          onClick={() => setActiveTab('url')}
          className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'url'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Website URL</span>
        </button>
      </div>

      {/* TAB 1: ZIP Upload */}
      {activeTab === 'zip' && (
        <div className="space-y-6">
          <div className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-white rounded-2xl p-8 text-center transition-colors">
            <input
              type="file"
              id="zip-input"
              accept=".zip"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="zip-input" className="cursor-pointer space-y-3 block">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                <FileArchive className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-800">
                  {selectedFile ? selectedFile.name : 'Click to select or drag & drop ZIP archive'}
                </div>
                <p className="text-xs text-slate-500">
                  {selectedFile
                    ? `Size: ${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`
                    : 'Supports Python, JavaScript/TypeScript, SQL, and configuration files'}
                </p>
              </div>
              <div className="text-[11px] text-slate-400">Configurable upload limit: 100 MB</div>
            </label>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {uploadResult && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Archive Safely Extracted into Isolated Workspace</span>
              </div>
              <div className="text-[11px] text-emerald-700">
                Extracted {uploadResult.file_count} files ({((uploadResult.total_uncompressed_bytes || 0) / (1024 * 1024)).toFixed(2)} MB). Zip-Slip verification passed.
              </div>
              <div className="pt-2">
                <button
                  onClick={handleStartAnalysis}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs flex items-center gap-2"
                >
                  <span>Start Autonomous Analysis</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="text-[11px] text-slate-500 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Zip-slip & Zip-bomb validation enforced before extraction</span>
            </div>

            <button
              onClick={handleZipUpload}
              disabled={!selectedFile || uploading || !currentProject}
              className={`px-5 py-2 rounded-xl text-white font-semibold text-xs shadow-xs flex items-center gap-2 ${
                !selectedFile || uploading || !currentProject
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validating & Extracting...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload & Verify Archive</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Evidence Upload */}
      {activeTab === 'evidence' && (
        <form onSubmit={handleEvidenceUpload} className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Upload Incident Report or Business Specification</h3>
            <p className="text-xs text-slate-500">
              Provide production post-mortems, change tickets, or policy documents. These are cross-correlated against code to catch conflicting business rules and prevent accidental pruning of compliance code.
            </p>
          </div>

          {evidenceSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Evidence document attached to project. Replanning engine will correlate findings!</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Document Identifier *</label>
              <input
                type="text"
                placeholder="e.g. INC-4092-weekend-settlement.txt"
                value={evidenceName}
                onChange={(e) => setEvidenceName(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Evidence Type</label>
              <select
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="incident_report">Production Incident Report (Post-Mortem)</option>
                <option value="change_ticket">Change Request Ticket (CR / Jira)</option>
                <option value="policy">Corporate Policy / Compliance Mandate</option>
                <option value="documentation">Architecture & Requirements Spec</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Document Content / Text</label>
            <textarea
              rows={6}
              placeholder="Paste incident findings, root cause analysis, or policy requirements here..."
              value={evidenceContent}
              onChange={(e) => setEvidenceContent(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={!evidenceContent.trim() && !evidenceFile}
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 disabled:bg-slate-300"
            >
              Attach Evidence Document
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: Database & SQL */}
      {activeTab === 'sql' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Database className="w-5 h-5 text-violet-600" />
            <span>Database Schema & Stored Procedures</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            LegacyLens AI parses SQL files using SQLGlot to extract database tables, check constraints, foreign keys, and WHERE-clause predicates.
            To analyze schemas, include `.sql`, `.ddl`, or `.dml` files in your main ZIP upload or place them in the project workspace.
          </p>
        </div>
      )}

      {/* TAB 4: GitHub Integration */}
      {activeTab === 'github' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <GitBranch className="w-5 h-5 text-slate-800" />
            <span>GitHub Repository Integration</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Connect private or enterprise repositories using fine-grained Personal Access Tokens (PAT). LegacyLens operates in a temporary isolated checkout branch to ensure production branches remain untouched.
          </p>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-[11px]">
            Extension point: Configure <code>GITHUB_TOKEN</code> in Settings to activate automated repository cloning.
          </div>
        </div>
      )}

      {/* TAB 5: Website URL */}
      {activeTab === 'url' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Globe className="w-5 h-5 text-blue-600" />
            <span>Public Website & API Endpoint Inspection</span>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] leading-relaxed">
            <strong>Security Boundary Notice:</strong> A public website URL provides access only to public endpoints, OpenAPI/Swagger specifications, and authorized public headers. It does NOT provide access to private backend source code or internal database schemas.
          </div>
        </div>
      )}
    </div>
  );
};
