import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const ExternalNode = ({ data, selected }: NodeProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const endpoints = Object.entries(data.endpoints || {});
  return (
    <div 
      onDoubleClick={() => setIsOpen(!isOpen)}
      className={`relative px-0 transition-all duration-300 min-w-[180px] group`}>
      <Handle type="target" position={Position.Top} id="top-target" className="!bg-external !w-2 !h-2 border-none ring-2 ring-bg-primary z-50 transition-transform hover:scale-150" />
      <Handle type="source" position={Position.Top} id="top-source" className="!w-4 !h-4 opacity-0 z-50 absolute -top-1" />

      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!bg-external !w-2 !h-2 border-none ring-2 ring-bg-primary z-50 transition-transform hover:scale-150" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-4 !h-4 opacity-0 z-50 absolute -bottom-1" />

      <Handle type="target" position={Position.Left} id="left-target" className="!bg-external !w-2 !h-2 border-none ring-2 ring-bg-primary z-50 transition-transform hover:scale-150" />
      <Handle type="source" position={Position.Left} id="left-source" className="!w-4 !h-4 opacity-0 z-50 absolute -left-1" />

      <Handle type="target" position={Position.Right} id="right-target" className="!bg-external !w-2 !h-2 border-none ring-2 ring-bg-primary z-50 transition-transform hover:scale-150" />
      <Handle type="source" position={Position.Right} id="right-source" className="!w-4 !h-4 opacity-0 z-50 absolute -right-1" />
      <div className={`relative w-[180px] transition-all duration-300 ${selected ? 'scale-105' : ''}`}>
        {/* Connection bracket accents */}
        <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-dashed border-text-secondary opacity-30"></div>
        <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-dashed border-text-secondary opacity-30"></div>
        
        <div className={`relative overflow-hidden border-2 border-dashed transition-all duration-500 
                        ${selected ? 'border-text-secondary shadow-[0_0_20px_rgba(255,255,255,0.1)]' : 'border-text-secondary/20 shadow-xl'}
                        rounded-xl bg-bg-node-solid backdrop-blur-md group-hover:border-text-secondary/50`}>
          
          <div className="h-1 bg-gradient-to-r from-transparent via-text-secondary to-transparent opacity-20"></div>
          
          <div className="p-4 flex flex-col items-center justify-center gap-1.5">
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
                className="bg-transparent border-b border-external text-[12px] font-black uppercase tracking-[0.15em] text-text-primary text-center leading-tight outline-none w-11/12"
              />
            ) : (
              <span 
                onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                className="text-[12px] font-black uppercase tracking-[0.15em] text-text-primary text-center leading-tight cursor-text"
              >
                {data.displayName}
              </span>
            )}
            <div className="relative">
              <span className="text-lg drop-shadow-[0_0_8px_rgba(107,114,128,0.5)]">🌐</span>
              <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-blue-500 rounded-full border border-bg-node-solid shadow-[0_0_10px_#3b82f6]"></div>
            </div>
          </div>

          <div className="h-[2px] bg-gradient-to-r from-text-secondary/0 via-text-secondary/10 to-text-secondary/0"></div>
        </div>
      </div>

      {/* Popover Endpoints */}
      {isOpen && endpoints.length > 0 && (
        <div className="absolute top-full left-0 w-full mt-2 bg-bg-sidebar/95 border border-dashed border-border-external rounded-lg p-3 z-[1000] 
                        shadow-2xl animate-in fade-in zoom-in-95 duration-200 origin-top backdrop-blur-md">
          <div className="text-[10px] font-bold text-text-secondary uppercase tracking-tighter mb-2 border-b border-border-external pb-1">
            External API
          </div>
          <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto pr-1">
            {endpoints.map(([id, ep]: any) => (
              <div key={id} className="flex justify-between items-center text-[10px]">
                <span className="font-black uppercase text-text-secondary/50 font-mono">{ep.method}</span>
                <span className="text-text-secondary font-mono truncate max-w-[120px]">{ep.path}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(ExternalNode);
