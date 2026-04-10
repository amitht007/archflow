import React, { useCallback, useEffect, useState, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { SDLParser } from '../../../../packages/sdl/src/SDLParser';

// Custom Nodes
import ServiceNode from './nodes/ServiceNode';
import GatewayNode from './nodes/GatewayNode';
import ExternalNode from './nodes/ExternalNode';
import DatabaseNode from './nodes/DatabaseNode';

// ─── Yjs Configuration ───────────────────────────────────────────────────────

const yDoc = new Y.Doc();
const provider = new WebsocketProvider(
  import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws',
  'archflow-main',
  yDoc
);

const servicesMap = yDoc.getMap('services');
const contractsMap = yDoc.getMap('contracts');
const datastoresMap = yDoc.getMap('datastores');
const canvasPositionsMap = yDoc.getMap('canvasPositions');

const parser = new SDLParser();

// ─── Node style presets by service type ──────────────────────────────────────

const NODE_STYLES: Record<string, React.CSSProperties> = {
  service: {
    background: 'rgba(59, 130, 246, 0.15)',
    border: '1px solid rgba(59, 130, 246, 0.6)',
    color: '#fff',
    width: 200,
    fontWeight: 600,
    fontSize: 12,
    borderRadius: 8,
  },
  gateway: {
    background: 'rgba(168, 85, 247, 0.15)',
    border: '1px solid rgba(168, 85, 247, 0.6)',
    color: '#fff',
    width: 200,
    fontWeight: 600,
    fontSize: 12,
    borderRadius: 8,
  },
  frontend: {
    background: 'rgba(249, 115, 22, 0.15)',
    border: '1px solid rgba(249, 115, 22, 0.6)',
    color: '#fff',
    width: 200,
    fontWeight: 600,
    fontSize: 12,
    borderRadius: 8,
  },
  external: {
    background: 'rgba(107, 114, 128, 0.15)',
    border: '1px solid rgba(107, 114, 128, 0.5)',
    color: '#aaa',
    width: 200,
    fontWeight: 500,
    fontSize: 12,
    borderRadius: 8,
  },
  contract: {
    background: 'rgba(16, 185, 129, 0.15)',
    border: '1px solid rgba(16, 185, 129, 0.5)',
    color: '#fff',
    width: 180,
    fontWeight: 500,
    fontSize: 11,
    borderRadius: 8,
  },
  datastore: {
    background: 'rgba(234, 179, 8, 0.15)',
    border: '1px solid rgba(234, 179, 8, 0.5)',
    color: '#fff',
    width: 180,
    fontWeight: 500,
    fontSize: 11,
    borderRadius: 8,
  },
};

const SERVICE_ICONS: Record<string, string> = {
  service: '🚀',
  gateway: '🔀',
  frontend: '🖥️',
  external: '🌐',
  contract: '📄',
  datastore: '🗄️',
};

// ─── Auto-layout: group by type into columns ──────────────────────────────────

function autoLayout(
  items: Array<{ id: string; group: string }>,
  savedPositions: Y.Map<any>
): Record<string, { x: number; y: number }> {
  // Group spacing constants
  const COL_WIDTH = 260;
  const ROW_HEIGHT = 100;
  const GROUP_GAP = 80;

  // Bucket items by group
  const groups: Record<string, string[]> = {};
  items.forEach(({ id, group }) => {
    if (!groups[group]) groups[group] = [];
    groups[group].push(id);
  });

  const positions: Record<string, { x: number; y: number }> = {};
  const groupOrder = ['frontend', 'gateway', 'service', 'external', 'datastore', 'contract'];

  let colX = 60;
  for (const groupKey of groupOrder) {
    const ids = groups[groupKey];
    if (!ids || ids.length === 0) continue;

    ids.forEach((id, rowIdx) => {
      // Respect saved positions if they exist
      const saved = savedPositions.get(id) as { x: number; y: number } | undefined;
      positions[id] = saved ?? { x: colX, y: 60 + rowIdx * ROW_HEIGHT };
    });

    colX += COL_WIDTH + GROUP_GAP;
  }

  return positions;
}

// ─── Node Types Registration ────────────────────────────────────────────────

const nodeTypes = {
  service: ServiceNode,
  gateway: GatewayNode,
  external: ExternalNode,
  database: DatabaseNode,
};

// ─── Component ───────────────────────────────────────────────────────────────

const BaseCanvas: React.FC<{ theme?: 'dark' | 'light' }> = ({ theme }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [liveSDL, setLiveSDL] = useState<string>('Loading SDL…');
  const [sdlStats, setSdlStats] = useState<{ services: number; contracts: number; datastores: number } | null>(null);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isSdlOpen, setIsSdlOpen] = useState(false);

  // Track WebSocket connection status
  useEffect(() => {
    provider.on('status', ({ status }: { status: string }) => {
      setWsStatus(status === 'connected' ? 'connected' : status === 'disconnected' ? 'disconnected' : 'connecting');
    });
  }, []);

  /**
   * Synchronize local React Flow state from Yjs shared maps.
   */
  const syncFromYjs = useCallback(() => {
    const newNodes: Node[] = [];

    const allItems: Array<{ id: string; group: string }> = [];
    servicesMap.forEach((_: any, id: string) => allItems.push({ id, group: (_?.get?.('type') ?? 'service') }));
    datastoresMap.forEach((_: any, id: string) => allItems.push({ id, group: 'datastore' }));

    const positions = autoLayout(allItems, canvasPositionsMap);

    // Services → nodes
    servicesMap.forEach((service: any, id: string) => {
      const svcType = service?.get?.('type') ?? 'service';
      const displayName = service?.get?.('displayName') ?? service?.get?.('name') ?? id;
      const owned = service?.get?.('owned') ?? true;
      const language = service?.get?.('stack')?.get?.('language');

      let nodeType = 'service';
      if (svcType === 'gateway') nodeType = 'gateway';
      else if (!owned) nodeType = 'external';

      newNodes.push({
        id,
        type: nodeType,
        data: {
          displayName,
          language,
          endpoints: service?.get?.('endpoints')?.toJSON() ?? {},
        },
        position: positions[id] ?? { x: 100, y: 100 },
      });
    });

    // Datastores → nodes
    datastoresMap.forEach((ds: any, id: string) => {
      const displayName = ds?.get?.('displayName') ?? id;
      newNodes.push({
        id,
        type: 'database',
        data: { displayName },
        position: positions[id] ?? { x: 500, y: 300 },
      });
    });

    setNodes(newNodes);

    // ─── Contracts → Edges ────────────────────────────────────────────────────
    const newEdges: Edge[] = [];
    contractsMap.forEach((contract: any, id: string) => {
      const fromId = contract?.get?.('from');
      const toId = contract?.get?.('to');
      const protocol = contract?.get?.('protocol') ?? 'REST';
      const passthrough = contract?.get?.('passthrough') === true;

      if (fromId && toId) {
        // Ensure IDs match the prefixed service IDs used for nodes
        const source = fromId.startsWith('svc_') ? fromId : `svc_${fromId}`;
        const target = toId.startsWith('svc_') ? toId : `svc_${toId}`;

        const isKafka = protocol.toLowerCase() === 'kafka';

        newEdges.push({
          id: `edge_${id}`,
          source,
          target,
          type: 'smoothstep',
          pathOptions: { borderRadius: 16 },
          sourceHandle: 'r',
          targetHandle: 'l',
          label: protocol,
          animated: passthrough,
          style: {
            stroke: isKafka ? '#f97316' : '#3b82f6',
            strokeWidth: 2,
            strokeDasharray: passthrough ? '5, 5' : undefined,
          },
          labelStyle: { fill: '#fff', fontSize: 10, fontWeight: 700 },
          labelBgStyle: { fill: 'rgba(20, 20, 20, 0.8)' },
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 4,
        });
      }
    });

    // ─── Datastores → Implicit Edges ──────────────────────────────────────────
    datastoresMap.forEach((ds: any, id: string) => {
      const owner = ds?.get?.('owner');
      if (owner) {
        const source = owner.startsWith('svc_') ? owner : `svc_${owner}`;
        newEdges.push({
          id: `edge_owner_${id}`,
          source,
          target: id,
          type: 'smoothstep',
          pathOptions: { borderRadius: 16 },
          sourceHandle: 'r',
          targetHandle: 'l',
          label: 'uses',
          animated: true,
          style: {
            stroke: '#eab308',
            strokeWidth: 2,
            strokeDasharray: '5, 5',
          },
          labelStyle: { fill: '#fff', fontSize: 10, fontWeight: 700 },
          labelBgStyle: { fill: 'rgba(20, 20, 20, 0.8)' },
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 4,
        });
      }
    });

    setEdges(newEdges);
    setSdlStats({
      services: servicesMap.size,
      contracts: contractsMap.size,
      datastores: datastoresMap.size,
    });

    // Update SDL view (only top-level keys to keep it readable)
    const sdl = parser.toSDL(yDoc);
    setLiveSDL(JSON.stringify(sdl, null, 2));
  }, []);

  /**
   * Fetch sdl.json from the API and seed Yjs if maps are empty.
   */
  useEffect(() => {
    const seedFromAPI = async () => {
      if (servicesMap.size > 0) {
        // Already seeded (e.g. from another connected client via Yjs)
        syncFromYjs();
        return;
      }

      try {
        const res = await fetch('/api/v1/sdl');
        if (!res.ok) throw new Error(`API returned ${res.status}`);
        const { data: sdlData } = await res.json();

        // Use SDLParser to populate all Yjs maps from the SDL
        parser.fromSDL(sdlData, yDoc);

        // Also store endpoint counts per service for display
        yDoc.transact(() => {
          if (sdlData.services) {
            for (const [svcId, svc] of Object.entries(sdlData.services) as any) {
              const svcMap = servicesMap.get(svcId) as Y.Map<any> | undefined;
              if (svcMap) {
                svcMap.set('displayName', svc.displayName ?? svcId);
                svcMap.set('type', svc.type ?? 'service');
                svcMap.set('endpointCount', Object.keys(svc.endpoints ?? {}).length);
              }
            }
          }
        });

        console.log('[Canvas] Seeded from API SDL:', Object.keys(sdlData.services ?? {}).length, 'services');
      } catch (err) {
        console.warn('[Canvas] API not reachable, using fallback demo nodes', err);
        // Fallback: 2 demo nodes
        yDoc.transact(() => {
          const authSvc = new Y.Map();
          authSvc.set('displayName', 'Auth Service');
          authSvc.set('type', 'service');
          authSvc.set('endpointCount', 5);
          servicesMap.set('svc_auth', authSvc);

          const gw = new Y.Map();
          gw.set('displayName', 'API Gateway');
          gw.set('type', 'gateway');
          gw.set('endpointCount', 0);
          servicesMap.set('svc_gateway', gw);
        });
      }
    };

    seedFromAPI();

    // Observe all maps for real-time updates
    servicesMap.observeDeep(syncFromYjs);
    contractsMap.observeDeep(syncFromYjs);
    datastoresMap.observeDeep(syncFromYjs);
    canvasPositionsMap.observeDeep(syncFromYjs);

    return () => {
      servicesMap.unobserveDeep(syncFromYjs);
      contractsMap.unobserveDeep(syncFromYjs);
      datastoresMap.unobserveDeep(syncFromYjs);
      canvasPositionsMap.unobserveDeep(syncFromYjs);
    };
  }, [syncFromYjs]);

  /**
   * Persist dragged node positions back to Yjs.
   */
  const onNodesChange: OnNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    yDoc.transact(() => {
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          canvasPositionsMap.set(change.id, {
            x: Math.round(change.position.x),
            y: Math.round(change.position.y),
          });
        }
      });
    });
  }, []);

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  /**
   * Hover highlighting logic
   */
  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    setHoveredNodeId(node.id);
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  // Compute highlighted nodes and edges
  const { highlightedNodes, highlightedEdges } = useMemo(() => {
    if (!hoveredNodeId) return { highlightedNodes: nodes, highlightedEdges: edges };

    const connectedNodeIds = new Set<string>([hoveredNodeId]);
    const connectedEdgeIds = new Set<string>();

    edges.forEach((edge) => {
      if (edge.source === hoveredNodeId || edge.target === hoveredNodeId) {
        connectedNodeIds.add(edge.source);
        connectedNodeIds.add(edge.target);
        connectedEdgeIds.add(edge.id);
      }
    });

    const styledNodes = nodes.map((node) => {
      const newNode = { ...node };
      newNode.style = {
        ...(node.style || {}),
        opacity: connectedNodeIds.has(node.id) ? 1 : 0.25,
        filter: connectedNodeIds.has(node.id) ? 'none' : 'grayscale(100%)',
        zIndex: connectedNodeIds.has(node.id) ? 10 : 0,
      };
      return newNode as any;
    });

    const styledEdges = edges.map((edge) => {
      const newEdge = { ...edge };
      if (connectedEdgeIds.has(edge.id)) {
        newEdge.animated = true;
      }
      newEdge.style = {
        ...(edge.style || {}),
        opacity: connectedEdgeIds.has(edge.id) ? 1 : 0.1,
        strokeWidth: connectedEdgeIds.has(edge.id) ? 4 : 2,
      };
      return newEdge as any;
    });

    return { highlightedNodes: styledNodes, highlightedEdges: styledEdges };
  }, [hoveredNodeId, nodes, edges]);

  const wsColor = wsStatus === 'connected' ? '#10b981' : wsStatus === 'disconnected' ? '#ef4444' : '#f59e0b';

  return (
    <div className="flex w-full h-screen bg-bg-primary overflow-hidden" style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      {/* Canvas Area */}
      <main className="flex-1 relative h-full min-w-0" style={{ flex: 1, position: 'relative', height: '100%', minWidth: 0 }}>
        <ReactFlow
          className="absolute inset-0"
          style={{ width: '100%', height: '100%' }}
          nodes={highlightedNodes}
          edges={highlightedEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          snapToGrid
          snapGrid={[15, 15]}
        >
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={30} 
            size={1.5} 
            color={theme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.06)'} 
          />
          <Controls className="!bg-bg-node !border-border !shadow-lg" />
          <MiniMap
            className="!bg-bg-node !border-border !shadow-lg hidden md:block"
            nodeColor={(n) => {
              const bg = (n.style?.border as string) ?? '';
              if (bg.includes('246')) return '#3b82f6';
              if (bg.includes('185')) return '#10b981';
              if (bg.includes('247')) return '#a855f7';
              if (bg.includes('115')) return '#f97316';
              if (bg.includes('234')) return '#eab308';
              return '#6b7280';
            }}
          />
        </ReactFlow>

        {/* Legend */}
        <div className="absolute bottom-6 left-6 z-10 bg-bg-legend/70 backdrop-blur-xl border border-white/5 
                        rounded-xl p-4 text-[11px] text-text-secondary flex flex-col gap-2 
                        shadow-[0_8px_32px_rgba(0,0,0,0.15)] ring-1 ring-black/5">
          {[
            { color: 'var(--color-service)', label: '🚀 Service' },
            { color: 'var(--color-gateway)', label: '🔀 Gateway' },
            { color: 'var(--color-frontend)', label: '🖥️ Frontend' },
            { color: 'var(--color-external)', label: '🌐 External' },
            { color: 'var(--color-database)', label: '🗄️ Datastore' },
            { color: 'var(--color-contract)', label: '📄 Contract' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-[2px] opacity-80"
                style={{ background: color }}
              />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Debug Sidebar Toggleable */}
      <aside 
        className={`shrink-0 h-full bg-bg-sidebar border-l border-white/5 backdrop-blur-2xl 
                    z-[100] flex flex-col shadow-[-10px_0_50px_rgba(0,0,0,0.25)] 
                    transition-all duration-500 ease-out overflow-hidden relative ${
                      isSdlOpen ? 'w-[35vw]' : 'w-12 cursor-pointer hover:bg-white/5'
                    }`}
        onClick={!isSdlOpen ? () => setIsSdlOpen(true) : undefined}
      >
        {isSdlOpen ? (
          <div className="p-5 flex flex-col gap-4 h-full min-w-[320px]">
            <div className="flex justify-between items-center">
              <h2 className="m-0 text-sm uppercase tracking-widest text-service font-bold">Live SDL</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: wsColor }} />
                  <span className="text-[10px] uppercase font-bold" style={{ color: wsColor }}>{wsStatus}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsSdlOpen(false); }}
                  className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 text-text-secondary transition-colors"
                  title="Close sidebar"
                >
                  ✕
                </button>
              </div>
            </div>

            {sdlStats && (
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: 'Services', val: sdlStats.services, color: 'var(--color-service)' },
                  { label: 'Contracts', val: sdlStats.contracts, color: '#10b981' },
                  { label: 'Datastores', val: sdlStats.datastores, color: 'var(--color-database)' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="flex-1 min-w-[70px] bg-white/5 border border-white/5 
                                            rounded-lg p-2 text-center"
                       style={{ borderColor: `${color}33` }}>
                    <div className="text-lg font-bold" style={{ color }}>{val}</div>
                    <div className="text-[9px] text-text-secondary uppercase tracking-[0.08em]">{label}</div>
                  </div>
                ))}
              </div>
            )}

            <pre className="bg-bg-pre text-text-primary p-4 rounded-lg font-mono text-[11px] 
                           overflow-auto flex-1 border border-border-subtle transition-all duration-300">
              {liveSDL}
            </pre>
          </div>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center relative">
            <div className="absolute top-4">
               <div className="w-2 h-2 rounded-full" style={{ background: wsColor }} />
            </div>
            <span className="whitespace-nowrap transform -rotate-90 text-[10px] uppercase tracking-[0.2em] text-text-secondary font-bold">
              View SDL
            </span>
          </div>
        )}
      </aside>
    </div>
  );
};

export default BaseCanvas;
