import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = status?.toLowerCase() || 'unknown';
  
  const getConfig = () => {
    switch (norm) {
      case 'verified':
      case 'user_confirmed':
      case 'passed':
      case 'success':
        return {
          wrapper: 'bg-emerald-50 text-emerald-800 border-emerald-200/90 shadow-2xs shadow-emerald-500/10',
          dot: 'bg-emerald-500',
          pulse: false
        };
      case 'conflicting':
      case 'failed':
      case 'error':
      case 'high':
        return {
          wrapper: 'bg-rose-50 text-rose-800 border-rose-200/90 shadow-2xs shadow-rose-500/10',
          dot: 'bg-rose-500',
          pulse: false
        };
      case 'inferred':
      case 'pending':
      case 'medium':
      case 'requires_investigation':
        return {
          wrapper: 'bg-amber-50 text-amber-800 border-amber-200/90 shadow-2xs shadow-amber-500/10',
          dot: 'bg-amber-500',
          pulse: false
        };
      case 'analyzing':
        return {
          wrapper: 'bg-indigo-50 text-indigo-800 border-indigo-200/90 shadow-2xs shadow-indigo-500/10',
          dot: 'bg-indigo-500',
          pulse: true
        };
      case 'low':
      case 'possibly_business_critical':
        return {
          wrapper: 'bg-sky-50 text-sky-800 border-sky-200/90 shadow-2xs shadow-sky-500/10',
          dot: 'bg-sky-500',
          pulse: false
        };
      case 'user_rejected':
      case 'blocked':
        return {
          wrapper: 'bg-slate-100 text-slate-700 border-slate-300 shadow-2xs',
          dot: 'bg-slate-400',
          pulse: false
        };
      default:
        return {
          wrapper: 'bg-slate-50 text-slate-600 border-slate-200 shadow-2xs',
          dot: 'bg-slate-400',
          pulse: false
        };
    }
  };

  const config = getConfig();
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[11px] gap-1.5' : 'px-2.5 py-1 text-xs gap-1.5';

  return (
    <span className={`inline-flex items-center font-medium rounded-full border transition-colors ${pad} ${config.wrapper}`}>
      <span className="relative flex h-1.5 w-1.5">
        {config.pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dot}`}></span>
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${config.dot}`}></span>
      </span>
      <span>{status ? status.replace(/_/g, ' ') : 'UNKNOWN'}</span>
    </span>
  );
};
