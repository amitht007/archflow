import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { FileJson, Menu, Moon, Sun, Settings, Library, Undo2, Redo2 } from 'lucide-react';
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
  Connection,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  ReactFlowInstance,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { SDLParser } from '../../../../packages/sdl/src/SDLParser';

import { yDoc, provider, servicesMap, contractsMap, datastoresMap, canvasPositionsMap, annotationsMap, undoManager } from '../lib/yjs';
import { useSelectionStore, SelectionType } from '../store/selectionStore';
import dagre from '@dagrejs/dagre';

import ServiceNode from './nodes/ServiceNode';
import GatewayNode from './nodes/GatewayNode';
import ExternalNode from './nodes/ExternalNode';
import DatabaseNode from './nodes/DatabaseNode';
import LambdaNode from './nodes/LambdaNode';
import StickyNote from './nodes/StickyNote';
import GroupNode from './nodes/GroupNode';
import Inspector from './Inspector';
import ContextMenu, { ContextMenuState } from './ContextMenu';
import ComponentLibrary, { decodeDragData, PaletteItemType } from './ComponentLibrary';

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

// ─── Dagre-based Hierarchical Auto-Layout (Left → Right) ─────────────────────

const NODE_W = 200;
const NODE_H = 80;

function computeLayout(
  nodes: Array<{ id: string; group: string }>,
  edges: Array<{ from: string; to: string }>,
  savedPositions: Y.Map<any>
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};

  // Any node with an already-saved manual position skips layout
  const unsaved = nodes.filter((n) => !savedPositions.has(n.id));

  if (unsaved.length === 0) {
    // All positions are user-set — just return them
    nodes.forEach(({ id }) => {
      positions[id] = savedPositions.get(id) as { x: number; y: number };
    });
    return positions;
  }

  // Build a Dagre graph for auto-layout
  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: 'LR',      // left-to-right hierarchy
    ranksep: 120,       // horizontal gap between ranks
    nodesep: 60,        // vertical gap between nodes in same rank
    marginx: 80,
    marginy: 80,
  });
  g.setDefaultEdgeLabel(() => ({}));

  unsaved.forEach(({ id }) => {
    g.setNode(id, { width: NODE_W, height: NODE_H });
  });

  edges.forEach(({ from, to }) => {
    if (g.hasNode(from) && g.hasNode(to)) {
      g.setEdge(from, to);
    }
  });

  dagre.layout(g);

  // Apply Dagre positions for unsaved nodes
  unsaved.forEach(({ id }) => {
    const n = g.node(id);
    if (n) positions[id] = { x: Math.round(n.x - NODE_W / 2), y: Math.round(n.y - NODE_H / 2) };
  });

  // Merge in user-saved positions for nodes that already had them
  nodes.forEach(({ id }) => {
    if (!positions[id]) {
      const saved = savedPositions.get(id) as { x: number; y: number } | undefined;
      if (saved) positions[id] = saved;
    }
  });

  return positions;
}

// ─── Node Types Registration ────────────────────────────────────────────────

const nodeTypes = {
  service: ServiceNode,
  gateway: GatewayNode,
  external: ExternalNode,
  database: DatabaseNode,
  lambda: LambdaNode,
  sticky: StickyNote,
  group: GroupNode,
};

// ─── Component ───────────────────────────────────────────────────────────────

const BaseCanvasInner: React.FC<{ theme?: 'dark' | 'light', toggleTheme?: () => void }> = ({ theme, toggleTheme }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [liveSDL, setLiveSDL] = useState<string>('Loading SDL…');
  const [sdlStats, setSdlStats] = useState<{ services: number; contracts: number; datastores: number } | null>(null);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [isSdlOpen, setIsSdlOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [gridValue, setGridValue] = useState(() => {
    const saved = localStorage.getItem('archflow_grid_value');
    return saved ? parseFloat(saved) : 0.25;
  });
  const [edgeFlexibility, setEdgeFlexibility] = useState(() => {
    const saved = localStorage.getItem('archflow_edge_flexibility');
    return saved ? parseInt(saved, 10) : 3;
  });
  const { selectedId, setSelected, clearSelection } = useSelectionStore();
  const rfInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const isRightSidebarOpen = isSdlOpen || selectedId !== null;

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

    // Build edge list for layout graph
    const edgeList: Array<{ from: string; to: string }> = [];
    contractsMap.forEach((contract: any, id: string) => {
      const from = contract?.get?.('from');
      const to = contract?.get?.('to');
      if (from && to) {
        edgeList.push({ from, to });
      }
    });
    datastoresMap.forEach((ds: any, id: string) => {
      const owner = ds?.get?.('owner');
      if (owner) {
        const src = owner.startsWith('svc_') ? owner : `svc_${owner}`;
        edgeList.push({ from: src, to: id });
      }
    });

    const positions = computeLayout(allItems, edgeList, canvasPositionsMap);

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
        // IDs are now handled universally without forcing svc_ prefix
        const source = fromId;
        const target = toId;

        const isKafka = protocol.toLowerCase() === 'kafka';

        const storedSH = contract?.get?.('sourceHandle');
        const storedTH = contract?.get?.('targetHandle');

        newEdges.push({
          id: `edge_${id}`,
          source,
          target,
          ...(storedSH ? { sourceHandle: storedSH } : { sourceHandle: 'right-source' }),
          ...(storedTH ? { targetHandle: storedTH } : { targetHandle: 'left-target' }),
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
        const source = owner;
        newEdges.push({
          id: `edge_owner_${id}`,
          source,
          target: id,
          sourceHandle: 'right-source',
          targetHandle: 'left-target',
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

    // ─── Annotations → Nodes ─────────────────────────────────────────────────────
    annotationsMap.forEach((ann: any, id: string) => {
      const annType = ann?.get?.('type') ?? 'sticky';
      const saved  = canvasPositionsMap.get(id) as { x: number; y: number } | undefined;
      newNodes.push({
        id,
        type: annType,
        data: {
          text:     ann?.get?.('text') ?? '',
          label:    ann?.get?.('label') ?? 'Domain',
          color:    ann?.get?.('color'),
          colorIdx: ann?.get?.('colorIdx') ?? 0,
        },
        position: saved ?? { x: 80, y: 80 },
        style: annType === 'group' ? { zIndex: -1 } : {},
      });
    });

    setNodes(newNodes);

    setEdges(newEdges);
    setSdlStats({
      services: servicesMap.size,
      contracts: contractsMap.size,
      datastores: datastoresMap.size,
    });

    const sdl = parser.toSDL(yDoc);
    setLiveSDL(JSON.stringify(sdl, null, 2));
  }, []);

  // ─── Keyboard Shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      // Don't intercept when user is typing in an input/textarea
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const metaKey = isMac ? e.metaKey : e.ctrlKey;

      // Undo / Redo
      if (metaKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoManager.undo();
        return;
      }
      if (metaKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        undoManager.redo();
        return;
      }

      // Duplicate selected — Cmd+D
      if (metaKey && e.key === 'd') {
        e.preventDefault();
        if (selectedId) handleDuplicate(selectedId);
        return;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedId]);

  // ─── Drag-and-Drop from Palette ────────────────────────────────────────────
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/archflow');
    if (!raw) return;
    const item = decodeDragData(raw);
    if (!item) return;

    const bounds = reactFlowWrapper.current?.getBoundingClientRect();
    if (!bounds) return;
    const position = rfInstance.screenToFlowPosition({ x: e.clientX, y: e.clientY });

    const uid = `${item.type === 'sticky' || item.type === 'group' ? 'ann' : item.type === 'database' ? 'db' : 'svc'}_${Math.random().toString(36).substring(2, 7)}`;

    yDoc.transact(() => {
      if (item.type === 'sticky' || item.type === 'group') {
        const ann = new Y.Map();
        ann.set('type', item.type);
        ann.set('text', item.type === 'sticky' ? 'New note…' : '');
        ann.set('label', item.type === 'group' ? (item.label ?? 'Domain') : '');
        ann.set('color', item.type === 'sticky' ? '#fef08a' : undefined);
        annotationsMap.set(uid, ann);
      } else if (item.type === 'database') {
        const ds = new Y.Map();
        ds.set('displayName', item.label);
        ds.set('type', item.subtype ?? 'postgresql');
        datastoresMap.set(uid, ds);
      } else {
        const svc = new Y.Map();
        svc.set('displayName', item.label);
        svc.set('type', item.type);
        svc.set('owned', item.type !== 'external');
        if (item.subtype) svc.set('subtype', item.subtype);
        servicesMap.set(uid, svc);
      }
      canvasPositionsMap.set(uid, { x: Math.round(position.x), y: Math.round(position.y) });
    });
  }, [rfInstance]);

  const handleAddItem = useCallback((item: PaletteItemType) => {
    const position = rfInstance.screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

    const uid = `${item.type === 'sticky' || item.type === 'group' ? 'ann' : item.type === 'database' ? 'db' : 'svc'}_${Math.random().toString(36).substring(2, 7)}`;

    yDoc.transact(() => {
      if (item.type === 'sticky' || item.type === 'group') {
        const ann = new Y.Map();
        ann.set('type', item.type);
        ann.set('text', item.type === 'sticky' ? 'New note…' : '');
        ann.set('label', item.type === 'group' ? (item.label ?? 'Domain') : '');
        ann.set('color', item.type === 'sticky' ? '#fef08a' : undefined);
        annotationsMap.set(uid, ann);
      } else if (item.type === 'database') {
        const ds = new Y.Map();
        ds.set('displayName', item.label);
        ds.set('type', item.subtype ?? 'postgresql');
        datastoresMap.set(uid, ds);
      } else {
        const svc = new Y.Map();
        svc.set('displayName', item.label);
        svc.set('type', item.type);
        svc.set('owned', item.type !== 'external');
        if (item.subtype) svc.set('subtype', item.subtype);
        servicesMap.set(uid, svc);
      }
      canvasPositionsMap.set(uid, { x: Math.round(position.x), y: Math.round(position.y) });
    });
  }, [rfInstance]);

  // ─── Context Menu Handlers ─────────────────────────────────────────────────
  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, nodeId: node.id, type: 'node' });
  }, []);

  const onEdgeContextMenu = useCallback((e: React.MouseEvent, edge: Edge) => {
    e.preventDefault();
    const cleanId = edge.id.split('_flex_')[0].replace('edge_', '');
    setContextMenu({ x: e.clientX, y: e.clientY, edgeId: cleanId, type: 'edge' });
  }, []);

  const onPaneContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'pane' });
  }, []);

  const handleContextDelete = useCallback((id: string, type: 'node' | 'edge') => {
    yDoc.transact(() => {
      if (type === 'edge') {
        contractsMap.delete(id);
      } else {
        const isAnnotation = annotationsMap.has(id);
        const isDatastore  = datastoresMap.has(id);
        if (isAnnotation) annotationsMap.delete(id);
        else if (isDatastore) datastoresMap.delete(id);
        else {
          servicesMap.delete(id);
          // Cascade delete contracts
          contractsMap.forEach((c: any, cid: string) => {
            const from = c.get?.('from');
            const to   = c.get?.('to');
            const svcId = id.replace('svc_', '');
            if (from === svcId || to === svcId || from === id || to === id) contractsMap.delete(cid);
          });
        }
        canvasPositionsMap.delete(id);
      }
    });
  }, []);

  const handleDuplicate = useCallback((nodeId: string) => {
    const newId = `${nodeId.split('_')[0]}_${Math.random().toString(36).substring(2, 7)}`;
    const pos   = canvasPositionsMap.get(nodeId) as { x: number; y: number } | undefined;
    const offset = { x: (pos?.x ?? 100) + 40, y: (pos?.y ?? 100) + 40 };

    yDoc.transact(() => {
      if (annotationsMap.has(nodeId)) {
        const src = annotationsMap.get(nodeId) as Y.Map<any>;
        const copy = new Y.Map();
        src.forEach((v: any, k: string) => copy.set(k, v));
        annotationsMap.set(newId, copy);
      } else if (datastoresMap.has(nodeId)) {
        const src = datastoresMap.get(nodeId) as Y.Map<any>;
        const copy = new Y.Map();
        src.forEach((v: any, k: string) => copy.set(k, v));
        datastoresMap.set(newId, copy);
      } else if (servicesMap.has(nodeId)) {
        const src = servicesMap.get(nodeId) as Y.Map<any>;
        const copy = new Y.Map();
        src.forEach((v: any, k: string) => copy.set(k, v));
        servicesMap.set(newId, copy);
      }
      canvasPositionsMap.set(newId, offset);
    });
  }, []);

  const handleExport = useCallback((nodeId: string) => {
    const src = servicesMap.get(nodeId) as Y.Map<any> | undefined;
    const data = src ? src.toJSON() : datastoresMap.get(nodeId);
    if (data) {
      const blob = new Blob([JSON.stringify({ [nodeId]: data }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${nodeId}.json`;
      a.click();
    }
  }, []);

  const handleCopyId = useCallback((id: string) => {
    navigator.clipboard?.writeText(id);
  }, []);

  const handleChangeType = useCallback((id: string) => {
    yDoc.transact(() => {
      if (servicesMap.has(id)) {
        const item = servicesMap.get(id) as Y.Map<any>;
        const current = item.get('type');
        const types = ['service', 'gateway', 'external', 'lambda'];
        const next = types[(types.indexOf(current) + 1) % types.length];
        item.set('type', next);
        if (next === 'external') item.set('owned', false);
        else item.set('owned', true);
      } else if (datastoresMap.has(id)) {
        const item = datastoresMap.get(id) as Y.Map<any>;
        const current = item.get('type');
        const types = ['postgresql', 'redis', 's3', 'mongodb', 'kafka'];
        const next = types[(types.indexOf(current) + 1) % types.length];
        item.set('type', next);
      }
    });
  }, []);

  const seedFromAPI = useCallback(async (force = false) => {
    if (servicesMap.size > 0 && !force) {
      syncFromYjs();
      return;
    }

    try {
      const res = await fetch('/api/v1/sdl');
      if (!res.ok) throw new Error(`API returned ${res.status}`);
      const { data: sdlData } = await res.json();

      yDoc.transact(() => {
        servicesMap.clear();
        contractsMap.clear();
        datastoresMap.clear();
      });

      parser.fromSDL(sdlData, yDoc);

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
  }, [syncFromYjs]);

  /**
   * Fetch sdl.json from the API and seed Yjs if maps are empty.
   */
  useEffect(() => {
    seedFromAPI();

    servicesMap.observeDeep(syncFromYjs);
    contractsMap.observeDeep(syncFromYjs);
    datastoresMap.observeDeep(syncFromYjs);
    annotationsMap.observeDeep(syncFromYjs);

    return () => {
      servicesMap.unobserveDeep(syncFromYjs);
      contractsMap.unobserveDeep(syncFromYjs);
      datastoresMap.unobserveDeep(syncFromYjs);
      annotationsMap.unobserveDeep(syncFromYjs);
    };
  }, [syncFromYjs, seedFromAPI]);

  /**
   * Persist dragged node positions back to Yjs.
   */
  const onNodesChange: OnNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    
    // Only persist to Yjs when the drag is COMPLETE (not every intermediate pixel)
    // This prevents the canvasPositionsMap observer from re-triggering syncFromYjs
    // mid-drag, which would overwrite the node's live position and make nodes disappear.
    const finalPositions = changes.filter(
      (c) => c.type === 'position' && c.position && c.dragging === false
    );
    if (finalPositions.length > 0) {
      yDoc.transact(() => {
        finalPositions.forEach((change) => {
          if (change.type === 'position' && change.position) {
            canvasPositionsMap.set(change.id, {
              x: Math.round(change.position.x),
              y: Math.round(change.position.y),
            });
          }
        });
      });
    }
  }, []);

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    
    yDoc.transact(() => {
      // Create new contract ID
      const contractId = `c_${Math.random().toString(36).substring(2, 10)}`;
      
      const contractMap = new Y.Map();
      contractMap.set('from', connection.source);
      contractMap.set('to', connection.target);
      contractMap.set('protocol', 'TCP'); // default
      contractMap.set('pattern', 'sync-request-response');
      
      if (connection.sourceHandle) contractMap.set('sourceHandle', connection.sourceHandle);
      if (connection.targetHandle) contractMap.set('targetHandle', connection.targetHandle);
      
      contractsMap.set(contractId, contractMap);
    });
  }, []);

  const onEdgeUpdate = useCallback((oldEdge: Edge, newConnection: Connection) => {
    const contractId = oldEdge.id.replace('edge_', '');
    const contractMap = contractsMap.get(contractId);
    
    if (contractMap instanceof Y.Map) {
      yDoc.transact(() => {
        if (newConnection.source) contractMap.set('from', newConnection.source);
        if (newConnection.target) contractMap.set('to', newConnection.target);
        if (newConnection.sourceHandle) contractMap.set('sourceHandle', newConnection.sourceHandle);
        if (newConnection.targetHandle) contractMap.set('targetHandle', newConnection.targetHandle);
      });
    }
  }, []);

  const onNodesDelete = useCallback((deleted: Node[]) => {
    yDoc.transact(() => {
      deleted.forEach((node) => {
        if (node.type === 'database') {
          datastoresMap.delete(node.id);
        } else if (node.type === 'sticky' || node.type === 'group') {
          annotationsMap.delete(node.id);
        } else {
          servicesMap.delete(node.id);
        }
        canvasPositionsMap.delete(node.id);

        // Cleanup associated contracts (phantom lines)
        contractsMap.forEach((contract: any, id: string) => {
          const from = contract.get('from');
          const to = contract.get('to');
          const svcId = node.id.replace('svc_', '');
          if (from === svcId || to === svcId || to === node.id) {
            contractsMap.delete(id);
          }
        });
      });
    });
  }, []);

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    yDoc.transact(() => {
      deleted.forEach((edge) => {
        if (edge.id.startsWith('edge_owner_')) {
          // Ownership edges represent 'owner' field in datastores
          const dsId = edge.target;
          const dsMap = datastoresMap.get(dsId);
          if (dsMap instanceof Y.Map) dsMap.set('owner', '');
        } else {
          const contractId = edge.id.replace('edge_', '');
          contractsMap.delete(contractId);
        }
      });
    });
  }, []);

  const createNewNode = (type: 'service' | 'gateway' | 'external' | 'database') => {
    const id = type === 'database' ? `db_${Math.random().toString(36).substring(2, 7)}` : `svc_${Math.random().toString(36).substring(2, 7)}`;
    const centerX = 200 + Math.random() * 100;
    const centerY = 200 + Math.random() * 100;

    yDoc.transact(() => {
      if (type === 'database') {
        const ds = new Y.Map();
        ds.set('displayName', 'New Database');
        ds.set('type', 'postgresql');
        datastoresMap.set(id, ds);
      } else {
        const svc = new Y.Map();
        svc.set('displayName', `New ${type.charAt(0).toUpperCase() + type.slice(1)}`);
        svc.set('type', type);
        svc.set('owned', type !== 'external');
        servicesMap.set(id, svc);
      }
      canvasPositionsMap.set(id, { x: centerX, y: centerY });
    });
  };

  const handleGridValueChange = (val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setGridValue(clamped);
    localStorage.setItem('archflow_grid_value', clamped.toString());
  };

  // Simulate friction via smoothstep: slope is 0 at ends - more physical movement for less value change
  const mappedOpacity = useMemo(() => {
    const s = gridValue;
    const smooth = (3 * s * s - 2 * s * s * s); // Smoothstep curve
    return smooth * 0.2; // Max 20%
  }, [gridValue]);

  /**
   * Hover highlighting logic
   */
  const onNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    setHoveredNodeId(node.id);
  }, []);

  const onNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  const { highlightedNodes, highlightedEdges } = useMemo(() => {
    const edgeTypesMapping = ['straight', 'step', 'smoothstep', 'default'] as const;
    const currentEdgeType = edgeTypesMapping[edgeFlexibility] ?? 'default';

    // Always apply edge type so the slider works even when nothing is hovered
    const typedEdges = edges.map((edge) => ({
      ...edge,
      type: currentEdgeType,
      id: edge.id,
    }));

    if (!hoveredNodeId) {
      return { highlightedNodes: nodes, highlightedEdges: typedEdges };
    }

    const connectedNodeIds = new Set<string>([hoveredNodeId]);
    const connectedEdgeIds = new Set<string>();

    // Use original edge IDs for lookup (before the flex suffix)
    edges.forEach((edge) => {
      if (edge.source === hoveredNodeId || edge.target === hoveredNodeId) {
        connectedNodeIds.add(edge.source);
        connectedNodeIds.add(edge.target);
        connectedEdgeIds.add(edge.id);
      }
    });

    const styledNodes = nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        isRenaming: renamingId === node.id,
        onRenameEnd: (newName?: string) => {
          setRenamingId(null);
          if (newName) {
            yDoc.transact(() => {
              if (servicesMap.has(node.id)) (servicesMap.get(node.id) as Y.Map<any>).set('displayName', newName);
              else if (datastoresMap.has(node.id)) (datastoresMap.get(node.id) as Y.Map<any>).set('displayName', newName);
            });
          }
        }
      },
      style: {
        ...(node.style || {}),
        opacity: connectedNodeIds.has(node.id) ? 1 : 0.25,
        filter: connectedNodeIds.has(node.id) ? 'none' : 'grayscale(100%)',
        zIndex: connectedNodeIds.has(node.id) ? 10 : 0,
      },
    })) as any[];

    const styledEdges = typedEdges.map((edge) => {
      const originalId = edge.id;
      const isConnected = connectedEdgeIds.has(originalId);
      return {
        ...edge,
        animated: isConnected ? true : edge.animated,
        style: {
          ...(edge.style || {}),
          opacity: isConnected ? 1 : 0.1,
          strokeWidth: isConnected ? 4 : 2,
        },
      };
    }) as any[];

    return { highlightedNodes: styledNodes, highlightedEdges: styledEdges };
  }, [hoveredNodeId, nodes, edges, edgeFlexibility]);

  const wsColor = wsStatus === 'connected' ? '#10b981' : wsStatus === 'disconnected' ? '#ef4444' : '#f59e0b';

  return (
    <div className="relative w-screen h-screen bg-bg-primary overflow-hidden">

      {/* ─── Floating Excalidraw-Style Toolbar ─────────────────────────── */}
      <div className="absolute left-6 top-1/2 -translate-y-1/2 z-[150] flex flex-col gap-2 
                      bg-bg-node-solid/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 
                      shadow-[0_8px_32px_rgba(0,0,0,0.3)] animate-in slide-in-from-left-8 fade-in">
        {[
          { type: 'service', label: 'Service/Rectangle', icon: '▭', color: 'text-blue-400' },
          { type: 'database', subtype: 'generic', label: 'Database/Cylinder', icon: '🛢️', color: 'text-yellow-400' },
          { type: 'external', label: 'External/Network', icon: '○', color: 'text-gray-400' },
          { type: 'gateway', label: 'Gateway/Logic', icon: '◇', color: 'text-purple-400' },
          { type: 'lambda', label: 'Lambda/Function', icon: '⊂⊃', color: 'text-orange-400' },
          { divider: true },
          { type: 'sticky', label: 'Sticky Note', icon: '📝', color: 'text-yellow-200' },
          { type: 'group', label: 'Domain/Region', icon: '⬚', color: 'text-white/40' },
        ].map((item, idx) => 
          item.divider ? (
            <div key={`div-${idx}`} className="w-full h-px bg-white/10 my-1 py-0" />
          ) : (
            <button
              key={item.type! + (item.subtype ?? '')}
              onClick={(e) => {
                e.stopPropagation();
                handleAddItem({
                   type: item.type!,
                   subtype: item.subtype,
                   label: item.label!.split('/')[0],
                   icon: item.icon!,
                   description: '',
                   color: item.color!
                });
              }}
              title={`Add ${item.label}`}
              className={`w-10 h-10 flex items-center justify-center rounded-xl bg-white/0 hover:bg-white/10 active:bg-white/5 
                         border border-transparent hover:border-white/10 cursor-pointer active:scale-90 transition-all 
                         duration-150 group text-lg ${item.color}`}
            >
              {item.icon}
            </button>
          )
        )}
      </div>

      {/* ─── Component Library Panel ───────────────────────────────────── */}
      <aside
        className={`absolute z-[100] flex flex-col transition-all duration-300 ease-out overflow-hidden shadow-[2px_0_20px_rgba(0,0,0,0.15)]
          ${isLibraryOpen
            ? 'top-0 left-0 h-full w-[240px] bg-bg-sidebar border-r border-white/5 backdrop-blur-2xl'
            : 'top-4 left-4 h-10 w-10 bg-bg-badge border border-border-subtle backdrop-blur-md rounded-lg cursor-pointer hover:bg-bg-node-solid'
          }`}
        onClick={!isLibraryOpen ? () => setIsLibraryOpen(true) : undefined}
      >
        {isLibraryOpen ? (
          <>
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <Library size={16} className="text-service" />
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); undoManager.undo(); }}
                  className="p-1.5 rounded hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
                  title="Undo (Cmd+Z)"
                ><Undo2 size={13} /></button>
                <button
                  onClick={(e) => { e.stopPropagation(); undoManager.redo(); }}
                  className="p-1.5 rounded hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
                  title="Redo (Cmd+Shift+Z)"
                ><Redo2 size={13} /></button>
                <button
                  onClick={(e) => { e.stopPropagation(); setIsLibraryOpen(false); }}
                  className="p-1.5 rounded hover:bg-white/10 text-text-secondary transition-colors ml-1"
                >✕</button>
              </div>
            </div>
            <ComponentLibrary isOpen={isLibraryOpen} onAddItem={handleAddItem} />
          </>
        ) : (
          <div className="flex items-center justify-center w-full h-16 text-text-secondary">
            <Library size={18} />
          </div>
        )}
      </aside>

      {/* ─── Canvas Area ───────────────────────────────────────────────── */}
      <main className="absolute inset-0 w-full h-full" ref={reactFlowWrapper}>
        <ReactFlow
          className="absolute inset-0"
          style={{ width: '100%', height: '100%' }}
          nodes={highlightedNodes}
          edges={highlightedEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeUpdate={onEdgeUpdate}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          onNodeMouseEnter={onNodeMouseEnter}
          onNodeMouseLeave={onNodeMouseLeave}
          onNodeClick={(_, node) => setSelected(node.id, node.type as SelectionType)}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onEdgeClick={(_, edge) => {
            const cleanId = edge.id;
            const originalId = cleanId.replace('edge_', '');
            const type = cleanId.includes('owner') ? null : 'contract';
            if (type) setSelected(originalId, type);
          }}
          onPaneClick={() => { clearSelection(); setContextMenu(null); }}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          snapToGrid
          snapGrid={[15, 15]}
          multiSelectionKeyCode="Shift"
          selectionKeyCode="Shift"
          deleteKeyCode={['Backspace', 'Delete']}
        >
          <Background 
            variant={BackgroundVariant.Lines} 
            gap={30} 
            size={1} 
            color={theme === 'light' ? `rgba(0,0,0,${mappedOpacity})` : `rgba(255,255,255,${mappedOpacity})`} 
          />
          <Controls 
            position="bottom-center" 
            className="!flex !flex-row !bg-bg-node !border-border !shadow-2xl !mb-4 !p-0.5 !gap-0.5 !rounded-xl
                       [&>button]:!border-none [&>button]:!bg-transparent hover:[&>button]:!bg-white/10 [&>button]:!transition-colors [&>button]:!rounded-lg" 
          />
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

        {contextMenu && (
          <ContextMenu
            menu={contextMenu}
            onClose={() => setContextMenu(null)}
            onDelete={handleContextDelete}
            onDuplicate={handleDuplicate}
            onRename={(id) => {
               // We set renaming state (which will trigger standard node inline rename logic)
               setRenamingId(id);
            }}
            onChangeType={handleChangeType}
            onCopyId={handleCopyId}
            onExport={handleExport}
          />
        )}

        {/* Legend */}
        <div className="absolute bottom-[80px] left-6 z-20 bg-bg-legend/70 backdrop-blur-xl border border-white/5 
                        rounded-xl p-4 text-[11px] text-text-secondary flex flex-col gap-2 
                        shadow-[0_8px_32px_rgba(0,0,0,0.15)] ring-1 ring-black/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
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

        {/* Creation Palette */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex gap-1 p-1 bg-bg-badge/80 backdrop-blur-md border border-border-subtle rounded-xl shadow-2xl">
          {[
            { id: 'service', label: 'Service', icon: '🚀', color: 'text-service' },
            { id: 'gateway', label: 'Gateway', icon: '🔀', color: 'text-gateway' },
            { id: 'external', label: 'External', icon: '🌐', color: 'text-external' },
            { id: 'database', label: 'Database', icon: '🗄️', color: 'text-database' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => createNewNode(item.id as any)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all active:scale-95 group"
            >
              <span className="text-sm">{item.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary group-hover:text-text-primary">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </main>

      {/* Settings / Excalidraw-like Left Sidebar */}
      <aside 
        className={`absolute z-[100] flex flex-col transition-all duration-300 ease-out overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.15)] ${
          isSettingsOpen 
            ? 'top-0 left-0 h-full w-[280px] bg-bg-sidebar border-r border-white/5 backdrop-blur-2xl rounded-none' 
            : 'bottom-6 left-6 w-10 h-10 bg-bg-badge border border-border-subtle backdrop-blur-md rounded-lg cursor-pointer hover:bg-bg-node-solid items-center justify-center'
        }`}
        onClick={!isSettingsOpen ? () => setIsSettingsOpen(true) : undefined}
      >
        {isSettingsOpen ? (
          <div className="p-5 flex flex-col gap-6 h-full min-w-[280px] overflow-y-auto w-full">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-service" />
                <h2 className="m-0 text-sm uppercase tracking-widest text-text-primary font-bold">Settings</h2>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); setIsSettingsOpen(false); }}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-white/10 text-text-secondary transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="flex flex-col gap-3 mt-4">
              <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Appearance</span>
              <button 
                onClick={(e) => { e.stopPropagation(); toggleTheme?.(); }}
                className="flex items-center justify-between w-full p-3 rounded-lg bg-bg-node border border-white/5 hover:border-service/50 transition-colors text-sm"
              >
                <div className="flex items-center gap-2">
                  {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
                  <span>Theme</span>
                </div>
                <span className="text-text-secondary capitalize">{theme}</span>
              </button>

              <div className="flex flex-col gap-2 p-3 rounded-lg bg-bg-node border border-white/5 mt-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-text-secondary font-bold uppercase tracking-wider">Grid Transparency</span>
                  <span className="text-service font-mono font-bold tracking-widest">{gridValue.toFixed(2)}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.001" 
                  value={gridValue} 
                  onChange={(e) => handleGridValueChange(parseFloat(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full accent-service cursor-pointer mt-1"
                />
              </div>

              <div className="flex flex-col gap-2 p-3 rounded-lg bg-bg-node border border-white/5 mt-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-text-secondary font-bold uppercase tracking-wider">Edge Curvature</span>
                  <span className="text-service font-mono font-bold tracking-widest">
                    {edgeFlexibility === 0 ? 'Rigid' : edgeFlexibility === 1 ? 'Step' : edgeFlexibility === 2 ? 'Smooth' : 'Fluid'}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="3" 
                  step="1" 
                  value={edgeFlexibility} 
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setEdgeFlexibility(val);
                    localStorage.setItem('archflow_edge_flexibility', val.toString());
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full accent-service cursor-pointer mt-1"
                />
              </div>
              
              <div className="mt-6 pt-4 border-t border-white/5 flex flex-col gap-2">
                <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Canvas</span>
                <button
                  onClick={(e) => { e.stopPropagation(); seedFromAPI(true); }}
                  className="flex items-center gap-2 w-full p-3 rounded-lg bg-bg-node border border-white/5 hover:border-red-500/50 text-sm text-text-secondary hover:text-red-400 transition-colors"
                >
                  <span>↺</span>
                  <span>Reset from SDL</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center text-text-secondary w-full h-full">
            <Settings size={18} className="opacity-80" />
          </div>
        )}
      </aside>

      {/* Right Sidebar Toggleable (SDL Viewer or Inspector) */}
      <aside 
        className={`absolute z-[100] flex flex-col transition-all duration-300 ease-out overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.15)] ${
          isRightSidebarOpen 
            ? 'top-0 right-0 h-full w-[450px] bg-bg-sidebar border-l border-white/5 backdrop-blur-2xl rounded-none' 
            : 'top-4 right-4 w-10 h-10 bg-bg-badge border border-border-subtle backdrop-blur-md rounded-lg cursor-pointer hover:bg-bg-node-solid items-center justify-center'
        }`}
        onClick={!isRightSidebarOpen ? () => setIsSdlOpen(true) : undefined}
      >
        {isRightSidebarOpen ? (
          selectedId ? (
            <Inspector />
          ) : (
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
          )
        ) : (
          <div className="flex items-center justify-center relative text-text-secondary w-full h-full">
            <div className="absolute -top-1 -right-1">
               <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_currentColor] border-[1.5px] border-bg-badge" style={{ color: wsColor, background: wsColor }} />
            </div>
            <FileJson size={18} className="opacity-80" />
          </div>
        )}
      </aside>
    </div>
  );
};

const BaseCanvas: React.FC<{ theme?: 'dark' | 'light', toggleTheme?: () => void }> = (props) => (
  <ReactFlowProvider>
    <BaseCanvasInner {...props} />
  </ReactFlowProvider>
);

export default BaseCanvas;
