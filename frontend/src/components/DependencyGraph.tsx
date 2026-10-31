import React, { useMemo, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { DependencyNode, DependencyEdge } from '../types';

interface DependencyGraphProps {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  onSelectNode?: (node: DependencyNode | null) => void;
}

const TYPE_COLORS: Record<string, string> = {
  module: '#1e1b4b',
  function: '#4338ca',
  endpoint: '#2563eb',
  table: '#7c3aed',
  test: '#059669',
  external: '#475569'
};

export const DependencyGraph: React.FC<DependencyGraphProps> = ({ nodes, edges, onSelectNode }) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Layout nodes in columns or circular grid
  const initialNodes: Node[] = useMemo(() => {
    const cols: Record<string, number> = {
      module: 50,
      function: 350,
      endpoint: 650,
      table: 950,
      external: 1250,
      test: 350
    };
    const rowTrackers: Record<string, number> = {};

    return nodes.map((n) => {
      const type = n.node_type || 'module';
      const colX = cols[type] || 50;
      const rowIndex = rowTrackers[type] || 0;
      rowTrackers[type] = rowIndex + 1;
      const posY = 50 + rowIndex * 90;

      const isSelected = n.node_key === selectedNodeId;
      const isHighRisk = n.risk_level === 'high';

      return {
        id: n.node_key,
        position: { x: colX, y: posY },
        data: {
          label: (
            <div className="text-left select-none">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/20">
                  {n.node_type}
                </span>
                {isHighRisk && (
                  <span className="text-[10px] bg-rose-500 text-white font-bold px-1 rounded">HIGH RISK</span>
                )}
              </div>
              <div className="font-semibold text-xs truncate max-w-[170px]" title={n.name}>
                {n.name}
              </div>
              {n.file_path && (
                <div className="text-[10px] text-white/70 truncate max-w-[170px]">
                  {n.file_path}
                </div>
              )}
            </div>
          ),
          rawNode: n
        },
        style: {
          background: TYPE_COLORS[n.node_type] || '#1e293b',
          color: '#ffffff',
          borderRadius: '10px',
          border: isSelected ? '3px solid #fbbf24' : isHighRisk ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
          padding: '8px 12px',
          width: 200,
          boxShadow: isSelected ? '0 0 15px rgba(251, 191, 36, 0.5)' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }
      };
    });
  }, [nodes, selectedNodeId]);

  const initialEdges: Edge[] = useMemo(() => {
    return edges.map((e, idx) => ({
      id: `edge-${idx}`,
      source: e.source_key,
      target: e.target_key,
      animated: e.relationship === 'queries' || e.relationship === 'routes',
      label: e.relationship,
      style: { stroke: '#94a3b8', strokeWidth: 1.5 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#94a3b8'
      },
      labelStyle: { fill: '#64748b', fontSize: 10, fontWeight: 500 }
    }));
  }, [edges]);

  const [rfNodes, , onNodesChange] = useNodesState(initialNodes);
  const [rfEdges, , onEdgesChange] = useEdgesState(initialEdges);

  const handleNodeClick = (_: any, node: Node) => {
    setSelectedNodeId(node.id);
    if (onSelectNode) {
      onSelectNode(node.data.rawNode as DependencyNode);
    }
  };

  return (
    <div className="w-full h-[650px] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-inner relative">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
      >
        <Background color="#334155" gap={20} size={1} />
        <Controls className="bg-slate-800 border-slate-700 fill-slate-200" />
        <MiniMap
          nodeColor={(n) => {
            const raw = n.data?.rawNode as DependencyNode;
            return TYPE_COLORS[raw?.node_type] || '#475569';
          }}
          className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden"
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-lg p-3 text-xs text-slate-300 flex flex-wrap gap-3 z-10">
        <span className="font-semibold text-slate-400">Node Types:</span>
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
