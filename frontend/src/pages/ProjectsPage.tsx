import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Plus, Trash2, ArrowRight, FileCode, CheckCircle, Clock, AlertCircle } from 'lucide-react';
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
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-indigo-600" />
            Modernization Projects
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage repositories, extracted rules, and migration roadmaps.</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300">
          <FolderKanban className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-50" />
          <h3 className="font-bold text-slate-800 text-sm">No Projects Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
            Create a new project or upload a codebase archive to start autonomous investigation.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium text-xs shadow-xs"
          >
            Create Your First Project
          </button>
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
                className={`p-5 rounded-2xl bg-white border cursor-pointer transition-all hover:shadow-md relative flex flex-col justify-between ${
                  isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-1" title={p.name}>
                      {p.name}
                    </h3>
                    <StatusBadge status={p.status} size="sm" />
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                    {p.description || 'No description provided.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl text-xs mb-4">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Files</span>
                      <span className="font-semibold text-slate-800">{p.stats?.file_count || 0}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">LOC</span>
                      <span className="font-semibold text-slate-800">{p.stats?.total_loc || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400">
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => handleDelete(p.id, e)}
                      title="Delete Project"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-indigo-600 font-semibold flex items-center gap-1">
                      Open <ArrowRight className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-1">Create Modernization Project</h2>
            <p className="text-xs text-slate-500 mb-4">Initialize a workspace to upload and analyze legacy source code.</p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Core Billing Engine"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Enterprise billing subsystem running Python and SQL."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold text-xs shadow-xs hover:bg-indigo-700"
                >
                  {loading ? 'Creating...' : 'Create & Proceed to Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
