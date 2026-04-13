import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const LambdaNode = ({ data, selected }: NodeProps) => {
  const [isEditing, setIsEditing] = useState(false);
  
  return (
  <div className={`relative px-0 min-w-[180px] group`}>
    <Handle type="target" position={Position.Top}    id="top-target"    className="!bg-orange-400 !w-2 !h-2 border-none ring-2 ring-bg-primary z-50" />
    <Handle type="source" position={Position.Top}    id="top-source"    className="!w-4 !h-4 opacity-0 z-50 absolute -top-1" />
    <Handle type="target" position={Position.Bottom} id="bottom-target" className="!bg-orange-400 !w-2 !h-2 border-none ring-2 ring-bg-primary z-50" />
    <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-4 !h-4 opacity-0 z-50 absolute -bottom-1" />
    <Handle type="target" position={Position.Left}   id="left-target"   className="!bg-orange-400 !w-2 !h-2 border-none ring-2 ring-bg-primary z-50" />
    <Handle type="source" position={Position.Left}   id="left-source"   className="!w-4 !h-4 opacity-0 z-50 absolute -left-1" />
    <Handle type="target" position={Position.Right}  id="right-target"  className="!bg-orange-400 !w-2 !h-2 border-none ring-2 ring-bg-primary z-50" />
    <Handle type="source" position={Position.Right}  id="right-source"  className="!w-4 !h-4 opacity-0 z-50 absolute -right-1" />

    <div className={`relative w-[180px] transition-all duration-300 ${selected ? 'scale-105' : ''}`}>
      <div className={`relative overflow-hidden border-2 transition-all duration-500
        ${selected ? 'border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.3)]' : 'border-orange-400/40 shadow-xl'}
        rounded-xl bg-bg-node-solid backdrop-blur-xl group-hover:border-orange-400/80`}>

        <div className="h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent opacity-50" />

        <div className="p-4 flex flex-col items-center justify-center gap-1.5">
          <span className="text-lg drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">λ</span>
          {data.isRenaming || isEditing ? (
            <input
              autoFocus
              defaultValue={data.displayName}
              onBlur={(e) => {
                data.onRenameEnd?.(e.target.value);
                setIsEditing(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { data.onRenameEnd?.(e.currentTarget.value); setIsEditing(false); }
                if (e.key === 'Escape') { data.onRenameEnd?.(undefined); setIsEditing(false); }
              }}
              className="bg-transparent border-b border-orange-400 text-[12px] font-black uppercase tracking-[0.15em] text-text-primary text-center leading-tight outline-none w-11/12"
            />
          ) : (
            <span 
              onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              className="text-[12px] font-black uppercase tracking-[0.15em] text-text-primary text-center leading-tight cursor-text"
            >
              {data.displayName}
            </span>
          )}
          {data.runtime && (
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-orange-400/10 text-orange-400 border border-orange-400/20">
              {data.runtime}
            </span>
          )}
        </div>
        <div className="h-[2px] bg-gradient-to-r from-orange-400/0 via-orange-400/20 to-orange-400/0" />
      </div>
    </div>
  </div>
  );
};

export default memo(LambdaNode);
