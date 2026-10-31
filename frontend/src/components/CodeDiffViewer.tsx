import React from 'react';

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
  const origLines = originalCode.split('\n');
  const propLines = proposedCode.split('\n');

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white text-xs font-mono">
      <div className="bg-slate-900 text-slate-200 px-4 py-2.5 flex items-center justify-between border-b border-slate-800">
        <span className="font-medium text-slate-300 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
          {filePath}
        </span>
        <span className="text-[11px] text-slate-400">Unified Modernization Diff</span>
      </div>

      {diffContent ? (
        <div className="overflow-x-auto p-4 bg-slate-950 text-slate-300 leading-relaxed max-h-[500px]">
          {diffContent.split('\n').map((line, idx) => {
            let lineClass = 'text-slate-400';
            if (line.startsWith('+') && !line.startsWith('+++')) {
              lineClass = 'bg-emerald-950/50 text-emerald-300 border-l-2 border-emerald-500 pl-1';
            } else if (line.startsWith('-') && !line.startsWith('---')) {
              lineClass = 'bg-rose-950/50 text-rose-300 border-l-2 border-rose-500 pl-1';
            } else if (line.startsWith('@@')) {
              lineClass = 'text-indigo-400 font-semibold py-1';
            }
            return (
              <div key={idx} className={`${lineClass} whitespace-pre`}>
                {line || ' '}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-2 divide-x divide-slate-200 max-h-[500px] overflow-y-auto">
          {/* Original */}
          <div className="bg-slate-50 p-4">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Original Legacy Source</div>
            {origLines.map((line, idx) => (
              <div key={idx} className="flex gap-3 hover:bg-slate-100">
                <span className="text-slate-400 select-none w-8 text-right">{idx + 1}</span>
                <span className="text-slate-800 whitespace-pre">{line || ' '}</span>
              </div>
            ))}
          </div>

          {/* Proposed */}
          <div className="bg-emerald-50/20 p-4">
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-2">Modernized Implementation</div>
            {propLines.map((line, idx) => (
              <div key={idx} className="flex gap-3 hover:bg-emerald-50">
                <span className="text-slate-400 select-none w-8 text-right">{idx + 1}</span>
                <span className="text-slate-900 whitespace-pre">{line || ' '}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
