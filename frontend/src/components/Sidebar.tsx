import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  FolderKanban,
  UploadCloud,
  Activity,
  LayoutDashboard,
  FileSpreadsheet,
  Network,
  Milestone,
  GitCompare,
  ShieldAlert,
  FileText,
  Zap,
  Settings,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface SidebarProps {
  hasActiveProject: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ hasActiveProject }) => {
  const navSections = [
    {
      title: 'Navigation',
      items: [
        { to: '/', label: 'Overview', icon: Home },
        { to: '/projects', label: 'Projects Catalogue', icon: FolderKanban },
        { to: '/upload', label: 'Universal Gateway', icon: UploadCloud },
      ]
    },
    {
      title: 'Investigation',
      items: [
        { to: '/analysis', label: 'Live Pipeline', icon: Activity, requiresProject: true },
        { to: '/dashboard', label: 'Architecture Matrix', icon: LayoutDashboard, requiresProject: true },
        { to: '/rules', label: 'Business Rules', icon: FileSpreadsheet, requiresProject: true },
        { to: '/dependencies', label: 'Dependency Graph', icon: Network, requiresProject: true },
      ]
    },
    {
      title: 'Modernization',
      items: [
        { to: '/redesign', label: 'Visual Studio', icon: Sparkles, requiresProject: true },
        { to: '/changes', label: 'Code Explorer & Gate', icon: GitCompare, requiresProject: true },
        { to: '/modernization', label: 'Debt & Roadmap', icon: Milestone, requiresProject: true },
        { to: '/verification', label: 'Preservation Gate', icon: ShieldAlert, requiresProject: true },
      ]
    },
    {
      title: 'System & Reports',
      items: [
        { to: '/reports', label: 'Executive Reports', icon: FileText, requiresProject: true },
        { to: '/benchmark', label: 'Benchmark Suite', icon: Zap },
        { to: '/settings', label: 'Engine Settings', icon: Settings },
      ]
    }
  ];

  return (
    <aside className="w-64 border-r border-slate-200/80 bg-white/95 backdrop-blur-md min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between shrink-0 transition-all">
      <div className="space-y-5">
        {navSections.map((sec, idx) => (
          <div key={idx} className="space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-1">
              {sec.title}
            </div>
            <nav className="space-y-0.5">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const disabled = item.requiresProject && !hasActiveProject;

                if (disabled) {
                  return (
                    <div
                      key={item.to}
                      title="Select or create a project first"
                      className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 cursor-not-allowed select-none"
                    >
                      <Icon className="w-4 h-4 opacity-40" />
                      <span>{item.label}</span>
                    </div>
                  );
                }

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 group ${
                        isActive
                          ? 'bg-indigo-50/90 text-indigo-700 font-semibold shadow-2xs shadow-indigo-500/10'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-700'}`} />
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Safety Notice Card */}
      <div className="mt-4 p-3 bg-gradient-to-br from-slate-50 to-indigo-50/40 border border-slate-200/90 rounded-xl text-[11px] text-slate-600 space-y-1.5 shadow-2xs">
        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Behaviour Gate Active</span>
        </div>
        <p className="text-slate-500 text-[10px] leading-relaxed">
          Legacy code is locked in a read-only sandbox. Proposals must pass dual-run baseline verification before approval.
        </p>
      </div>
    </aside>
  );
};
