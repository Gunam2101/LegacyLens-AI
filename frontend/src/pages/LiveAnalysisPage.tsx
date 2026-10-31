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
  RotateCw
} from 'lucide-react';
import { Project, AnalysisEvent } from '../types';
import { api } from '../services/api';

interface LiveAnalysisPageProps {
  currentProject: Project | null;
  refreshProjects: () => void;
}

const STAGES = [
  'Discovery',
  'Dependencies',
  'Rules',
  'Features',
  'Evidence & Obsolete',
  'Verification Baseline',
  'Roadmap',
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

  const handleRestartAnalysis = async () => {
    if (!currentProject) return;
    setEvents([]);
    setProgress(0);
    setIsCompleted(false);
    setElapsedSec(0);
    setIsStreaming(true);
    await api.startAnalysis(currentProject.id);
  };

  if (!currentProject) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Please select a project to view live analysis.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-600" />
            Live Investigation & Reconstruction Engine
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Observing autonomous multi-stage static analysis, rule reconstruction, and test execution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Elapsed: {elapsedSec}s</span>
          </div>

          {isCompleted && (
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs flex items-center gap-2"
            >
              <span>View Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleRestartAnalysis}
            className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs"
            title="Re-run Analysis"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-600">
            Current Stage: <span className="text-indigo-600 font-bold">{currentStage}</span>
          </span>
          <span className="text-indigo-600 font-bold">{progress}% Completed</span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 transition-all duration-300 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Pipeline Stage Pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
          {STAGES.map((st, idx) => {
            const isDone = progress >= ((idx + 1) / STAGES.length) * 100;
            const isCurrent = currentStage.toLowerCase().includes(st.toLowerCase());

            return (
              <div
                key={st}
                className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 transition-colors ${
                  isDone
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                    : isCurrent
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-800 font-bold shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-current text-[10px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                )}
                <span className="truncate">{st}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Real Agent Activity Log Terminal */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xl text-xs font-mono">
        <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-300 font-semibold">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span>Agent Orchestration Event Stream</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live SSE Connection</span>
          </div>
        </div>

        <div className="p-4 space-y-2 max-h-[380px] overflow-y-auto leading-relaxed">
          {events.length === 0 ? (
            <div className="text-slate-500 py-6 text-center italic">
              Connecting to analysis stream...
            </div>
          ) : (
            events.map((ev, idx) => {
              let textCol = 'text-slate-300';
              if (ev.level === 'error') textCol = 'text-rose-400 font-semibold';
              if (ev.level === 'warning') textCol = 'text-amber-300 font-semibold';
              if (ev.level === 'success') textCol = 'text-emerald-400 font-semibold';

              return (
                <div key={idx} className="flex items-start gap-3 hover:bg-slate-900/50 p-1 rounded">
                  <span className="text-slate-500 shrink-0 select-none">
                    [{new Date(ev.timestamp).toLocaleTimeString()}]
                  </span>
                  <span className="text-indigo-400 shrink-0 font-bold uppercase text-[10px] px-1 bg-indigo-950 rounded border border-indigo-800">
                    {ev.stage}
                  </span>
                  <span className={textCol}>{ev.message}</span>
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
