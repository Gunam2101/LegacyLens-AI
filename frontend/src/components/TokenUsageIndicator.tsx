import React, { useEffect, useState } from 'react';
import { Cpu, Sparkles, Loader2, Info, Zap } from 'lucide-react';
import { TokenUsage } from '../types';
import { api } from '../services/api';

interface TokenUsageIndicatorProps {
  projectId: string;
  tokenUsage?: TokenUsage | null;
  isAnalyzing?: boolean;
  className?: string;
}

export const TokenUsageIndicator: React.FC<TokenUsageIndicatorProps> = ({
  projectId,
  tokenUsage: externalUsage,
  isAnalyzing = false,
  className = ''
}) => {
  const [internalUsage, setInternalUsage] = useState<TokenUsage | null>(null);
  const [loading, setLoading] = useState(false);

  // Load persisted or latest token usage on initial mount if not provided via props
  useEffect(() => {
    if (externalUsage !== undefined && externalUsage !== null) {
      setInternalUsage(externalUsage);
      return;
    }

    if (!projectId) return;

    let isMounted = true;
    setLoading(true);
    api.getTokenUsage(projectId)
      .then((data) => {
        if (isMounted) setInternalUsage(data);
      })
      .catch(() => {
        if (isMounted) {
          setInternalUsage({
            available: false,
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0,
            reason: 'Token usage unavailable'
          });
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [projectId, externalUsage]);

  const activeUsage = externalUsage || internalUsage;
  const isAvailable = activeUsage?.available === true && (activeUsage.total_tokens > 0 || (activeUsage.input_tokens + activeUsage.output_tokens > 0));

  // 1. Loading State (Analysis is running and waiting for model telemetry, or initial fetch)
  if ((isAnalyzing && !isAvailable) || (loading && !activeUsage)) {
    return (
      <div
        className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-cyan-500/30 text-cyan-200 text-xs shadow-sm shadow-cyan-950/40 backdrop-blur-md select-none transition-all ${className}`}
        title="Tracking actual model token consumption as analysis progresses"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
        </span>
        <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
        <span className="font-mono text-[11px] text-cyan-300 font-medium tracking-tight">
          Measuring token consumption...
        </span>
      </div>
    );
  }

  // 2. Unavailable State (No model usage was recorded or credentials not configured)
  if (!isAvailable) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 text-xs shadow-2xs backdrop-blur-sm select-none transition-all hover:border-slate-700 ${className}`}
        title="Token usage unavailable: Local deterministic AST heuristics or cache used with 0 cloud LLM tokens consumed."
      >
        <Info className="w-3 h-3 text-slate-500 shrink-0" />
        <span className="text-[11px] font-medium text-slate-400">
          Token usage unavailable
        </span>
      </div>
    );
  }

  // 3. Available State: Premium Dark Navy, Neon Blue & Violet Theme
  const modelName = activeUsage.model || (activeUsage.provider ? `${activeUsage.provider} model` : 'AI Model');

  return (
    <div
      className={`inline-flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-indigo-500/30 shadow-md shadow-indigo-950/40 backdrop-blur-md text-slate-200 select-none transition-all hover:border-cyan-400/50 hover:shadow-cyan-950/40 ${className}`}
      title={`Live AI Telemetry: ${activeUsage.calls_count || 1} model request(s) via ${modelName}`}
    >
      {/* Icon & Model Chip */}
      <div className="flex items-center gap-1.5">
        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-2xs">
          <Zap className="w-3 h-3 text-cyan-400 fill-cyan-400/20" />
        </div>
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400/90 hidden sm:inline">
          Tokens
        </span>
        {activeUsage.model && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-violet-950/80 border border-violet-700/50 text-violet-300 font-semibold truncate max-w-[110px]" title={activeUsage.model}>
            {activeUsage.model}
          </span>
        )}
      </div>

      <div className="h-3 w-px bg-slate-800 hidden xs:block" />

      {/* Metrics Row: Input, Output, Total */}
      <div className="flex items-center gap-2.5 text-[11px] font-mono">
        {/* Input Tokens */}
        <div className="flex items-center gap-1" title="Prompt / Input Tokens">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">In:</span>
          <span className="font-semibold text-slate-200">
            {activeUsage.input_tokens.toLocaleString()}
          </span>
        </div>

        <span className="text-slate-700 select-none">•</span>

        {/* Output Tokens */}
        <div className="flex items-center gap-1" title="Candidates / Output Tokens">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Out:</span>
          <span className="font-semibold text-slate-200">
            {activeUsage.output_tokens.toLocaleString()}
          </span>
        </div>

        <span className="text-slate-700 select-none">•</span>

        {/* Total Tokens (Gradient Neon Accent) */}
        <div className="flex items-center gap-1.5 pl-0.5" title="Total Tokens Consumed">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-cyan-400">Total:</span>
          <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-violet-400">
            {activeUsage.total_tokens.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};
