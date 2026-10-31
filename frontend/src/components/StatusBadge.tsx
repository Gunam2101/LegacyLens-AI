import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = status?.toLowerCase() || 'unknown';
  
  const getStyle = () => {
    switch (norm) {
      case 'verified':
      case 'user_confirmed':
      case 'passed':
      case 'success':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20';
      case 'conflicting':
      case 'failed':
      case 'error':
      case 'high':
        return 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20';
      case 'inferred':
      case 'pending':
      case 'medium':
      case 'requires_investigation':
        return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20';
      case 'analyzing':
        return 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20 animate-pulse';
      case 'low':
      case 'possibly_business_critical':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-500/20';
      case 'user_rejected':
      case 'blocked':
        return 'bg-slate-100 text-slate-700 border-slate-300 ring-slate-500/20';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  const pad = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center font-medium rounded-full border shadow-xs tracking-tight ${pad} ${getStyle()}`}>
      {status ? status.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN'}
    </span>
  );
};
