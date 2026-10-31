import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layers, ShieldCheck, Cpu, Zap, Activity, ChevronDown, Plus } from 'lucide-react';
import { Project } from '../types';

interface NavbarProps {
  currentProject: Project | null;
  projects: Project[];
  onSelectProject: (p: Project) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentProject, projects, onSelectProject }) => {
  const navigate = useNavigate();

  return (
    <header className="h-16 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl sticky top-0 z-40 px-6 flex items-center justify-between transition-all">
      {/* Brand & Workspace Context */}
      <div className="flex items-center gap-4">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-900 via-indigo-900 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 group-hover:shadow-indigo-500/30 transition-all duration-200">
            <Layers className="w-5 h-5 text-indigo-100" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base text-slate-900 tracking-tight">
                Legacy<span className="text-indigo-600">Lens</span>
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/80 tracking-wide">
                AI
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-medium -mt-0.5 hidden sm:block">
              Evidence-Driven Modernization
            </div>
          </div>
        </Link>

        {/* Project Selector */}
        {projects.length > 0 && (
          <div className="ml-4 pl-4 border-l border-slate-200 flex items-center gap-2">
            <label htmlFor="active-project-select" className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden md:inline">
              Project:
            </label>
            <div className="relative">
              <select
                id="active-project-select"
                aria-label="Active Project"
                className="text-xs font-semibold text-slate-800 bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200/80 rounded-lg py-1.5 pl-3 pr-8 cursor-pointer focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all appearance-none"
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
              <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Right Toolbar */}
      <div className="flex items-center gap-3">
        {/* Active Engine Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100/80 border border-slate-200/80 text-[11px] text-slate-700">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
          </span>
          <span className="font-semibold text-slate-800">Deterministic AST Engine</span>
          <span className="text-slate-400">&bull;</span>
          <span className="text-slate-500">Dual-Run Gate</span>
        </div>

        {/* Benchmark CTA */}
        <button
          onClick={() => navigate('/benchmark')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50/90 hover:bg-indigo-100/90 text-indigo-700 font-semibold text-xs transition-all duration-150 border border-indigo-200/80 hover:shadow-xs active:scale-[0.98]"
        >
          <Zap className="w-3.5 h-3.5 fill-indigo-500 text-indigo-600" />
          <span>Benchmark Suite</span>
        </button>

        {/* Upload Button */}
        <button
          onClick={() => navigate('/upload')}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm shadow-indigo-600/30 hover:shadow-md hover:shadow-indigo-600/40 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-150"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Onboard App</span>
        </button>
      </div>
    </header>
  );
};
