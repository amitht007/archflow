import React, { useEffect, useRef } from 'react';
import { Copy, Trash2, Type, Clipboard, FileJson, RefreshCw } from 'lucide-react';

export interface ContextMenuState {
  x: number;
  y: number;
  nodeId?: string;
  edgeId?: string;
  type: 'node' | 'edge' | 'pane';
}

interface Props {
  menu: ContextMenuState;
  onClose: () => void;
  onDelete: (id: string, type: 'node' | 'edge') => void;
  onDuplicate: (nodeId: string) => void;
  onRename: (nodeId: string) => void;
  onChangeType: (nodeId: string) => void;
  onCopyId: (id: string) => void;
  onExport: (nodeId: string) => void;
}

const ContextMenu = ({ menu, onClose, onDelete, onDuplicate, onRename, onChangeType, onCopyId, onExport }: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', esc);
    };
  }, [onClose]);

  const items: Array<{
    icon: React.ReactNode;
    label: string;
    action: () => void;
    danger?: boolean;
    show?: boolean;
  }> = [
    {
      icon: <Type size={13} />,
      label: 'Rename',
      action: () => { if (menu.nodeId) onRename(menu.nodeId); onClose(); },
      show: !!menu.nodeId,
    },
    {
      icon: <Copy size={13} />,
      label: 'Duplicate',
      action: () => { if (menu.nodeId) onDuplicate(menu.nodeId); onClose(); },
      show: !!menu.nodeId,
    },
    {
      icon: <RefreshCw size={13} />,
      label: 'Cycle Shape Type',
      action: () => { if (menu.nodeId) onChangeType(menu.nodeId); onClose(); },
      show: !!menu.nodeId,
    },
    {
      icon: <Clipboard size={13} />,
      label: 'Copy ID',
      action: () => { if (menu.nodeId || menu.edgeId) { onCopyId(menu.nodeId ?? menu.edgeId!); onClose(); } },
      show: true,
    },
    {
      icon: <FileJson size={13} />,
      label: 'Export as JSON',
      action: () => { if (menu.nodeId) onExport(menu.nodeId); onClose(); },
      show: !!menu.nodeId,
    },
    {
      icon: <Trash2 size={13} />,
      label: 'Delete',
      action: () => {
        if (menu.nodeId) onDelete(menu.nodeId, 'node');
        else if (menu.edgeId) onDelete(menu.edgeId, 'edge');
        onClose();
      },
      danger: true,
      show: !!(menu.nodeId || menu.edgeId),
    },
  ].filter((item) => item.show !== false);

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', left: menu.x, top: menu.y, zIndex: 9999 }}
      className="bg-bg-sidebar/95 backdrop-blur-xl border border-border-subtle rounded-xl shadow-2xl py-1.5 min-w-[160px]
                 animate-in fade-in zoom-in-95 duration-100 origin-top-left"
    >
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {item.danger && <div className="mx-2 my-1 border-t border-border-subtle" />}
          <button
            onClick={item.action}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium transition-colors hover:bg-white/5
              ${item.danger ? 'text-red-400 hover:text-red-300' : 'text-text-primary'}`}
          >
            {item.icon}
            {item.label}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
};

export default ContextMenu;
