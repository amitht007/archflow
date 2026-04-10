import React, { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps, NodeResizer } from 'reactflow';
import { annotationsMap, yDoc } from '../../lib/yjs';
import * as Y from 'yjs';

const StickyNote = ({ data, selected, id }: NodeProps) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(data.text ?? 'Double-click to edit…');
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && ref.current) ref.current.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const note = annotationsMap.get(id);
    if (note instanceof Y.Map) {
      yDoc.transact(() => note.set('text', text));
    }
  };

  const color = data.color ?? '#fef08a';

  return (
    <div
      style={{ background: color, minWidth: 180, minHeight: 100 }}
      className={`relative rounded-lg shadow-xl border-2 p-3 flex flex-col gap-1 transition-all duration-200 ${
        selected ? 'border-yellow-400 shadow-yellow-400/20' : 'border-transparent'
      }`}
      onDoubleClick={() => setEditing(true)}
    >
      <NodeResizer
        minWidth={140}
        minHeight={80}
        isVisible={selected}
        lineClassName="border-yellow-400"
        handleClassName="bg-yellow-400 border border-white rounded-sm"
      />
      <Handle type="source" position={Position.Right} id="right-source" className="!bg-yellow-500 !w-2 !h-2" />
      <Handle type="target" position={Position.Left}  id="left-target"  className="!bg-yellow-500 !w-2 !h-2" />

      <div className="text-[9px] font-black uppercase tracking-widest opacity-40 text-black select-none">📝 Note</div>

      {editing ? (
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Escape') commit(); }}
          className="w-full flex-1 bg-transparent resize-none text-[12px] text-black outline-none"
          rows={4}
        />
      ) : (
        <p className="text-[12px] text-black/80 whitespace-pre-wrap flex-1 leading-snug">{text}</p>
      )}
    </div>
  );
};

export default memo(StickyNote);
