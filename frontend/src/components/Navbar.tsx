import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, ShieldCheck, Cpu, Zap, Activity } from 'lucide-react';
import { Project } from '../types';

interface NavbarProps {
  currentProject: Project | null;
  projects: Project[];
  onSelectProject: (p: Project) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentProject, projects, onSelectProject }) => {
  const navigate = useNavigate();

  return (
    <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-30 px-6 flex items-center justify-between">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-950 via-indigo-700 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
              Legacy<span className="text-indigo-600">Lens</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">AI</span>
            </span>
            <div className="text-[10px] text-slate-600 font-medium -mt-1 hidden sm:block">
              Evidence-Driven Modernization
            </div>
          </div>
        </Link>

        {/* Project Selector */}
        {projects.length > 0 && (
          <div className="ml-6 pl-6 border-l border-slate-200 flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Project:</span>
            <select
              className="text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 border-none rounded-lg py-1.5 px-3 cursor-pointer focus:ring-2 focus:ring-indigo-500 transition-colors"
              value={currentProject?.id || ''}
              onChange={(e) => {
                const found = projects.find(p => p.id === e.target.value);
                if (found) {
                  onSelectProject(found);
                }
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.status})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-4">
        {/* Active Provider Tag */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700">
          <Cpu className="w-3.5 h-3.5 text-indigo-600" />
          <span className="font-medium">Orchestrator:</span>
          <span className="text-slate-600">AST + LLM Provider</span>
        </div>

        {/* Benchmark CTA */}
        <button
          onClick={() => navigate('/benchmark')}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs transition-colors border border-indigo-200"
        >
          <Zap className="w-3.5 h-3.5 fill-indigo-500 text-indigo-600" />
          <span>Benchmark Suite</span>
        </button>

        {/* Upload Button */}
        <button
          onClick={() => navigate('/upload')}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-sm shadow-indigo-600/30 transition-all hover:shadow-md"
        >
          <span>Upload Application</span>
        </button>
      </div>
    </header>
  );
};
