import React, { memo, useState } from 'react';
import { NodeProps, NodeResizer } from 'reactflow';
import { annotationsMap, yDoc } from '../../lib/yjs';
import * as Y from 'yjs';

const GROUP_COLORS = [
  'rgba(59,130,246,0.08)',
  'rgba(168,85,247,0.08)',
  'rgba(16,185,129,0.08)',
  'rgba(249,115,22,0.08)',
  'rgba(234,179,8,0.08)',
];

const GROUP_BORDERS = [
  'rgba(59,130,246,0.3)',
  'rgba(168,85,247,0.3)',
  'rgba(16,185,129,0.3)',
  'rgba(249,115,22,0.3)',
  'rgba(234,179,8,0.3)',
];

const GroupNode = ({ data, selected, id }: NodeProps) => {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(data.label ?? 'Domain');
  const colorIdx = data.colorIdx ?? 0;

  const commit = () => {
    setEditing(false);
    const grp = annotationsMap.get(id);
    if (grp instanceof Y.Map) yDoc.transact(() => grp.set('label', label));
  };

  return (
    <div
      style={{
        background: GROUP_COLORS[colorIdx % GROUP_COLORS.length],
        border: `2px dashed ${GROUP_BORDERS[colorIdx % GROUP_BORDERS.length]}`,
        minWidth: 240,
        minHeight: 160,
        borderRadius: 12,
        position: 'relative',
      }}
      className="transition-all duration-200"
    >
      <NodeResizer
        minWidth={200}
        minHeight={140}
        isVisible={selected}
        lineStyle={{ borderColor: GROUP_BORDERS[colorIdx % GROUP_BORDERS.length] }}
      />

      {/* Label at top-left */}
      <div
        className="absolute top-2 left-3 flex items-center gap-1"
        onDoubleClick={() => setEditing(true)}
      >
        {editing ? (
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') commit(); }}
            className="bg-transparent border-b border-current text-[11px] font-bold uppercase tracking-widest outline-none text-white/50 w-32"
          />
        ) : (
          <span
            className="text-[11px] font-black uppercase tracking-widest opacity-40 text-white cursor-default select-none"
            title="Double-click to rename"
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
};

export default memo(GroupNode);
