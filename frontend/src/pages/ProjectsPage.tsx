import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  Trash2,
  ArrowRight,
  FileCode,
  CheckCircle,
  Clock,
  AlertCircle,
  Globe,
  GitBranch,
  FileArchive,
  X
} from 'lucide-react';
import { Project } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

interface ProjectsPageProps {
  projects: Project[];
  currentProject: Project | null;
  onSelectProject: (p: Project) => void;
  refreshProjects: () => void;
}

export const ProjectsPage: React.FC<ProjectsPageProps> = ({
  projects,
  currentProject,
  onSelectProject,
  refreshProjects,
}) => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const proj = await api.createProject(name, description);
      refreshProjects();
      onSelectProject(proj);
      setShowModal(false);
      setName('');
      setDescription('');
      navigate('/upload');
    } catch (err: any) {
      alert(`Error creating project: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project and its workspace?')) {
      try {
        await api.deleteProject(id);
        refreshProjects();
      } catch (err: any) {
        alert(`Error deleting project: ${err.message}`);
      }
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Workspaces Catalogue
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FolderKanban className="w-6 h-6 text-indigo-600" />
            <span>Modernization Projects</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage codebases, reconstructed rule catalogues, and staged migration workspaces.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>New Modernization Project</span>
        </button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 shadow-2xs space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
            <FolderKanban className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">No Projects Initialized</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Create a new modernization workspace or onboard a website URL, ZIP archive, or Git repository.
          </p>
          <div className="pt-2">
            <button
              onClick={() => setShowModal(true)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm shadow-indigo-600/25 transition-all"
            >
              Create Your First Project
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((p) => {
            const isSelected = currentProject?.id === p.id;
            return (
              <div
                key={p.id}
                onClick={() => {
                  onSelectProject(p);
                  navigate('/dashboard');
                }}
                className={`p-5 rounded-2xl bg-white border cursor-pointer transition-all duration-200 hover:shadow-lg relative flex flex-col justify-between group hover:-translate-y-0.5 ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200/90 hover:border-indigo-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-indigo-600 transition-colors" title={p.name}>
                      {p.name}
                    </h3>
                    <StatusBadge status={p.status} size="sm" />
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                    {p.description || 'No description provided.'}
                  </p>

                  {/* Source Type & Meta Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-4">
                    {p.source_type === 'url' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        <Globe className="w-3 h-3" /> URL Website
                      </span>
                    ) : p.source_type === 'git' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        <GitBranch className="w-3 h-3" /> Git Repo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                        <FileArchive className="w-3 h-3" /> ZIP Source
                      </span>
                    )}

                    {p.frameworks && p.frameworks.slice(0, 2).map((fw) => (
                      <span key={fw} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {fw}
                      </span>
                    ))}
                  </div>

                  {/* Stats Box */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50/80 rounded-xl text-xs mb-4 border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Indexed Files</span>
                      <span className="font-bold text-slate-800 font-mono">{p.stats?.file_count || 0}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Lines of Code</span>
                      <span className="font-bold text-slate-800 font-mono">{(p.stats?.total_loc || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDelete(p.id, e)}
                      title="Delete Project"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-indigo-600 font-semibold flex items-center gap-1 text-xs group-hover:translate-x-0.5 transition-transform">
                      Open Matrix <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">Create Modernization Project</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-5">Initialize a secure workspace to analyze legacy source code and synthesize proposals.</p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Core Billing Engine"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Enterprise legacy subsystem handling transactions and policy adjudication."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm shadow-indigo-600/30 transition-all hover:scale-[1.02]"
                >
                  {loading ? 'Creating...' : 'Create & Proceed to Gateway'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
