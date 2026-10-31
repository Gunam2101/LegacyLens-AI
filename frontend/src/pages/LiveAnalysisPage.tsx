import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  CheckCircle2,
  Clock,
  Terminal,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Play,
  RotateCw,
  Sparkles,
  GitCompare,
  Check,
  Circle
} from 'lucide-react';
import { Project, AnalysisEvent, TokenUsage } from '../types';
import { api } from '../services/api';
import { TokenUsageIndicator } from '../components/TokenUsageIndicator';

interface LiveAnalysisPageProps {
  currentProject: Project | null;
  refreshProjects: () => void;
}

const STAGES = [
  'Input Validation',
  'Source Acquisition',
  'Project Identification',
  'File Inventory',
  'Dependency Analysis',
  'Business-Rule Extraction',
  'Technical-Debt Detection',
  'Risk Assessment',
  'Website Visual Capture',
  'Modernization Proposals',
  'Verification Baseline',
  'Replanning & Evidence',
  'Complete'
];

export const LiveAnalysisPage: React.FC<LiveAnalysisPageProps> = ({ currentProject, refreshProjects }) => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<AnalysisEvent[]>([]);
  const [currentStage, setCurrentStage] = useState('Initializing');
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [liveTokenUsage, setLiveTokenUsage] = useState<TokenUsage | null>(null);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timer: any;
    if (isStreaming && !isCompleted) {
      timer = setInterval(() => setElapsedSec(s => s + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isStreaming, isCompleted]);

  useEffect(() => {
    if (!currentProject) return;

    // Load initial token usage from project stats if present
    if (currentProject.stats?.token_usage) {
      setLiveTokenUsage(currentProject.stats.token_usage);
    }

    // Load existing events
    api.getAnalysisEvents(currentProject.id).then((evs) => {
      setEvents(evs);
      if (evs.length > 0) {
        const last = evs[evs.length - 1];
        setCurrentStage(last.stage);
        setProgress(last.progress);
        if (last.progress === 100 || currentProject.status === 'analyzed') {
          setIsCompleted(true);
        }
        // Extract latest token usage from events if present
        const withUsage = [...evs].reverse().find(e => e.token_usage);
        if (withUsage?.token_usage) {
          setLiveTokenUsage(withUsage.token_usage);
        }
      }
    });

    // Start SSE stream
    setIsStreaming(true);
    const eventSource = new EventSource(`/api/v1/analysis/${currentProject.id}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data: AnalysisEvent = JSON.parse(event.data);
        setEvents((prev) => [...prev, data]);
        setCurrentStage(data.stage);
        setProgress(data.progress);

        // Dynamically update token usage as new telemetry arrives
        if (data.token_usage) {
          setLiveTokenUsage(data.token_usage);
        }

        if (data.progress === 100) {
          setIsCompleted(true);
          setIsStreaming(false);
          refreshProjects();
          eventSource.close();
        }
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    };

    eventSource.onerror = () => {
      setIsStreaming(false);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [currentProject?.id]);

  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const handleRelaunch = async () => {
    if (!currentProject) return;
    setEvents([]);
    setProgress(0);
    setIsCompleted(false);
    setElapsedSec(0);
    setLiveTokenUsage(null);
    try {
      await api.startAnalysis(currentProject.id);
      window.location.reload();
    } catch (e: any) {
      alert(`Relaunch failed: ${e.message}`);
    }
  };

  if (!currentProject) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <Activity className="w-6 h-6" />
        </div>
        <h2 className="text-sm font-bold text-slate-800">No Active Project Selected</h2>
        <p className="text-xs text-slate-500">Please choose an application to stream real-time modernization analysis.</p>
        <button
          onClick={() => navigate('/projects')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
        >
          Select from Projects
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-2 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Autonomous Investigation Engine
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-indigo-600 animate-pulse" />
            <span>Live Analysis Stream & Execution Pipeline</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time event fan-out: AST syntax parsing, domain predicate reconstruction, and characterization gate.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <TokenUsageIndicator
            projectId={currentProject.id}
            tokenUsage={liveTokenUsage}
            isAnalyzing={isStreaming && !isCompleted}
          />

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 border border-slate-200/80 text-xs text-slate-700 font-mono shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{elapsedSec}s elapsed</span>
          </div>

          <button
            onClick={handleRelaunch}
            className="px-3.5 py-1.5 rounded-xl border border-slate-200/90 hover:border-indigo-400 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all active:scale-[0.98]"
          >
            <RotateCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Restart Pipeline</span>
          </button>
        </div>
      </div>

      {/* Progress & Stage Stepper Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Active Pipeline Stage</span>
            <div className="flex items-center gap-2.5">
              <span className="text-lg font-bold text-slate-900 tracking-tight">{currentStage}</span>
              {isStreaming && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-600"></span>
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Measured Progress</span>
            <span className="text-3xl font-extrabold text-indigo-600 font-mono tracking-tight">{progress}%</span>
          </div>
        </div>

        {/* Progress Track */}
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-200/80">
          <div
            className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-300 ease-out shadow-xs"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* 13 Stages Visual Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
          {STAGES.map((s, idx) => {
            const stepThreshold = Math.round(((idx + 1) / STAGES.length) * 100);
            const isDone = progress >= stepThreshold;
            const isCurrent = currentStage.toLowerCase().includes(s.toLowerCase().slice(0, 5));

            return (
              <div
                key={s}
                className={`p-2 rounded-xl text-center border text-[11px] transition-all duration-150 flex flex-col items-center justify-center gap-1 ${
                  isDone
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800 font-semibold'
                    : isCurrent
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-800 font-bold ring-2 ring-indigo-500/10'
                    : 'bg-slate-50/70 border-slate-200/80 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-1">
                  {isDone ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse shrink-0"></span>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-mono">{idx + 1}</span>
                  )}
                  <span className="truncate">{s}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Completion Banner */}
      {isCompleted && (
        <div className="p-5 bg-gradient-to-r from-emerald-50 via-teal-50/60 to-indigo-50 border border-emerald-200/90 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm shadow-emerald-600/30 shrink-0">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm tracking-tight">Autonomous Modernization Investigation Complete</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                All business rules, dependency graphs, visual redesign prototypes, and characterization test baselines are cataloged.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all hover:scale-[1.02]"
            >
              <span>Inspect Matrix</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigate('/changes')}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all hover:scale-[1.02]"
            >
              <GitCompare className="w-3.5 h-3.5 text-indigo-600" />
              <span>Review Code Diff</span>
            </button>
            {currentProject?.source_type === 'url' || (currentProject?.redesign_data && Object.keys(currentProject.redesign_data).length > 0) ? (
              <button
                onClick={() => navigate('/redesign')}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all hover:scale-[1.02]"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                <span>Visual Studio</span>
              </button>
            ) : (
              <button
                onClick={() => navigate('/modernization')}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 font-semibold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-all hover:scale-[1.02]"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Modernization Plan</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Terminal View */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800/90 overflow-hidden shadow-2xl flex flex-col font-mono text-xs">
        <div className="bg-slate-900/90 backdrop-blur-md px-4 py-3 border-b border-slate-800 flex items-center justify-between text-slate-400">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 mr-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
            </div>
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-slate-200">Analysis Orchestrator Terminal</span>
            <span className="text-[11px] text-slate-500">({events.length} events logged)</span>
          </div>
          <span className="text-[11px] text-emerald-400 flex items-center gap-1.5 bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-900/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Pub-Sub SSE Stream
          </span>
        </div>

        <div className="p-4 space-y-1.5 overflow-y-auto max-h-[480px] text-slate-300 dark-scrollbar leading-relaxed">
          {events.length === 0 ? (
            <div className="text-slate-600 py-12 text-center flex flex-col items-center justify-center gap-2">
              <Activity className="w-5 h-5 animate-spin text-slate-500" />
              <span>Connecting to centralized pipeline broadcast queue...</span>
            </div>
          ) : (
            events.map((ev, index) => {
              let tagColor = 'text-indigo-400 bg-indigo-950/40 border-indigo-900/30';
              if (ev.level === 'warning') tagColor = 'text-amber-400 bg-amber-950/40 border-amber-900/30';
              if (ev.level === 'error') tagColor = 'text-rose-400 bg-rose-950/40 border-rose-900/30';
              if (ev.level === 'success') tagColor = 'text-emerald-400 bg-emerald-950/40 border-emerald-900/30';

              return (
                <div key={ev.id || index} className="flex items-start gap-3 hover:bg-slate-900/50 py-1 px-1.5 rounded-sm transition-colors">
                  <span className="text-slate-500 select-none text-[10px] shrink-0 pt-0.5 font-mono">
                    {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : '--:--:--'}
                  </span>
                  <span className={`font-semibold shrink-0 text-[10px] px-1.5 py-0.5 rounded border font-mono ${tagColor}`}>
                    {ev.stage}
                  </span>
                  <span className="text-slate-200 text-xs leading-relaxed">{ev.message}</span>
                </div>
              );
            })
          )}
          <div ref={terminalBottomRef} />
        </div>
      </div>
    </div>
  );
};
