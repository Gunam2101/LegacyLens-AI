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
  Settings
} from 'lucide-react';

interface SidebarProps {
  hasActiveProject: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ hasActiveProject }) => {
  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/projects', label: 'Projects', icon: FolderKanban },
    { to: '/upload', label: 'Upload App', icon: UploadCloud },
    { to: '/analysis', label: 'Live Analysis', icon: Activity, requiresProject: true },
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, requiresProject: true },
    { to: '/rules', label: 'Business Rules', icon: FileSpreadsheet, requiresProject: true },
    { to: '/dependencies', label: 'Dependencies', icon: Network, requiresProject: true },
    { to: '/modernization', label: 'Modernization', icon: Milestone, requiresProject: true },
    { to: '/changes', label: 'Code Changes', icon: GitCompare, requiresProject: true },
    { to: '/verification', label: 'Verification Gate', icon: ShieldAlert, requiresProject: true },
    { to: '/reports', label: 'Reports', icon: FileText, requiresProject: true },
    { to: '/benchmark', label: 'Benchmarking', icon: Zap },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-slate-200 bg-white min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <div>
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">
          Investigation & Modernization
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const disabled = item.requiresProject && !hasActiveProject;

            if (disabled) {
              return (
                <div
                  key={item.to}
                  title="Select or create a project first"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 cursor-not-allowed select-none"
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
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Safety Notice Card */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
          Behaviour-Preservation Gate
        </div>
        <p className="text-slate-500 text-[10px] leading-relaxed">
          Original legacy source code is protected in read-only sandbox. Changes execute in isolated workspace with dual-run baseline verification.
        </p>
      </div>
    </aside>
  );
};
