import React, { useState } from 'react';
import { Copy, Check, Columns, AlignLeft, FileCode } from 'lucide-react';

interface CodeDiffViewerProps {
  originalCode: string;
  proposedCode: string;
  diffContent?: string;
  filePath: string;
}

export const CodeDiffViewer: React.FC<CodeDiffViewerProps> = ({
  originalCode,
  proposedCode,
  diffContent,
  filePath
}) => {
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [copied, setCopied] = useState(false);

  const origLines = (originalCode || '').split('\n');
  const propLines = (proposedCode || '').split('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(proposedCode || originalCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-slate-800 rounded-2xl overflow-hidden shadow-xl bg-slate-950 text-xs font-mono">
      {/* Code Header Bar */}
      <div className="bg-slate-900/90 backdrop-blur-md text-slate-200 px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 mr-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
          </div>
          <FileCode className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-slate-200 tracking-tight">{filePath}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 text-[11px]">
            <button
              onClick={() => setViewMode('unified')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'unified'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlignLeft className="w-3 h-3" />
              <span>Unified Diff</span>
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                viewMode === 'split'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns className="w-3 h-3" />
              <span>Side-by-Side</span>
            </button>
          </div>

          {/* Copy Proposed Code */}
          <button
            onClick={handleCopy}
            title="Copy Proposed Implementation"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors text-[11px]"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Code Display Area */}
      {viewMode === 'unified' && diffContent ? (
        <div className="overflow-x-auto p-4 bg-slate-950 text-slate-300 leading-relaxed max-h-[550px] dark-scrollbar">
          {diffContent.split('\n').map((line, idx) => {
            let lineClass = 'text-slate-400';
            if (line.startsWith('+') && !line.startsWith('+++')) {
              lineClass = 'bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500 pl-2 py-0.5';
            } else if (line.startsWith('-') && !line.startsWith('---')) {
              lineClass = 'bg-rose-950/40 text-rose-300 border-l-2 border-rose-500 pl-2 py-0.5';
            } else if (line.startsWith('@@')) {
              lineClass = 'text-indigo-400 font-semibold py-1 bg-indigo-950/20 px-1 rounded-sm my-1';
            }
            return (
              <div key={idx} className={`${lineClass} whitespace-pre font-mono`}>
                {line || ' '}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 max-h-[550px] overflow-y-auto dark-scrollbar">
          {/* Original */}
          <div className="bg-slate-950/80 p-4">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                Original Legacy Code
              </span>
              <span className="text-slate-500">{origLines.length} lines</span>
            </div>
            {origLines.map((line, idx) => (
              <div key={idx} className="flex gap-3 hover:bg-slate-900/60 py-0.5 px-1 rounded-xs">
                <span className="text-slate-600 select-none w-8 text-right font-mono text-[11px]">{idx + 1}</span>
                <span className="text-slate-300 whitespace-pre overflow-x-auto">{line || ' '}</span>
              </div>
            ))}
          </div>

          {/* Proposed */}
          <div className="bg-slate-950/60 p-4">
            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-3 flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Modernized Implementation
              </span>
              <span className="text-emerald-500/70">{propLines.length} lines</span>
            </div>
            {propLines.map((line, idx) => (
              <div key={idx} className="flex gap-3 hover:bg-emerald-950/20 py-0.5 px-1 rounded-xs">
                <span className="text-slate-600 select-none w-8 text-right font-mono text-[11px]">{idx + 1}</span>
                <span className="text-emerald-100 whitespace-pre overflow-x-auto">{line || ' '}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
