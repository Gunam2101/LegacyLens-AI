import React, { useEffect, useState } from 'react';
import { Network, Filter, AlertTriangle, ShieldCheck, Info } from 'lucide-react';
import { Project, DependencyGraph as IDependencyGraph, DependencyNode } from '../types';
import { api } from '../services/api';
import { DependencyGraph } from '../components/DependencyGraph';
import { StatusBadge } from '../components/StatusBadge';

interface DependencyPageProps {
  currentProject: Project | null;
}

export const DependencyPage: React.FC<DependencyPageProps> = ({ currentProject }) => {
  const [graphData, setGraphData] = useState<IDependencyGraph | null>(null);
  const [selectedNode, setSelectedNode] = useState<DependencyNode | null>(null);
  const [nodeTypeFilter, setNodeTypeFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentProject) return;
    setLoading(true);
    api.getDependencies(currentProject.id, nodeTypeFilter || undefined, riskFilter || undefined)
      .then(setGraphData)
      .finally(() => setLoading(false));
  }, [currentProject?.id, nodeTypeFilter, riskFilter]);

  if (!currentProject) {
    return <div className="p-8 text-center text-xs text-slate-500">Select a project to view the dependency graph.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Network className="w-6 h-6 text-indigo-600" />
            Evidence-Based Dependency Explorer
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Traceable architectural relationships mapped from AST calls, SQL schemas, and endpoint bindings.
          </p>
        </div>
      </div>

      {/* Filter and Metrics Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Entity Filter:</span>
            <select
              value={nodeTypeFilter}
              onChange={(e) => setNodeTypeFilter(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-700 outline-none"
            >
              <option value="">All Entities</option>
              <option value="module">Modules Only</option>
              <option value="function">Functions Only</option>
              <option value="endpoint">API Endpoints</option>
              <option value="table">SQL Tables</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-600">Risk Level:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 font-medium text-slate-700 outline-none"
            >
              <option value="">All Risks</option>
              <option value="high">High Risk (High In-Degree)</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
            </select>
          </div>
        </div>

        {graphData && (
          <div className="flex items-center gap-4 text-slate-500 font-medium">
            <span>{graphData.stats.total_nodes} Nodes</span>
            <span>&bull;</span>
            <span>{graphData.stats.total_edges} Connections</span>
            <span>&bull;</span>
            <span className="text-rose-600 font-semibold">{graphData.stats.high_risk_count} High-Coupling Nodes</span>
          </div>
        )}
      </div>

      {/* React Flow Interactive Graph */}
      {loading ? (
        <div className="h-[600px] bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center text-slate-400 text-xs">
          Loading dependency graph...
        </div>
      ) : graphData ? (
        <DependencyGraph
          nodes={graphData.nodes}
          edges={graphData.edges}
          onSelectNode={setSelectedNode}
        />
      ) : null}

      {/* Node Inspector Drawer */}
      {selectedNode && (
        <div className="bg-white p-5 rounded-2xl border border-indigo-200 shadow-md text-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-900">{selectedNode.name}</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border">
                {selectedNode.node_type}
              </span>
              <StatusBadge status={selectedNode.risk_level} size="sm" />
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-slate-400 hover:text-slate-600 font-bold"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-slate-50 rounded-xl text-slate-600">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase">File Location</span>
              <span className="font-mono text-[11px] text-slate-800">{selectedNode.file_path || 'External / System'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Line Number</span>
              <span className="font-mono text-[11px] text-slate-800">{selectedNode.line_number || 'Top-level'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Node Key</span>
              <span className="font-mono text-[11px] text-slate-800 truncate block">{selectedNode.node_key}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase">Coupling Risk</span>
              <span className="font-medium text-slate-800 capitalize">{selectedNode.risk_level} impact</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
