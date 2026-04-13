import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const GatewayNode = ({ data, selected }: NodeProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const endpoints = Object.entries(data.endpoints || {});
  return (
    <div 
      onDoubleClick={() => setIsOpen(!isOpen)}
      className={`relative px-0 min-w-[180px] group`}>
      <Handle type="target" position={Position.Top} id="top-target" className="!bg-gateway !w-2 !h-2 border-none ring-2 ring-bg-primary z-50 transition-transform hover:scale-150" />
      <Handle type="source" position={Position.Top} id="top-source" className="!w-4 !h-4 opacity-0 z-50 absolute -top-1" />

      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!bg-gateway !w-2 !h-2 border-none ring-2 ring-bg-primary z-50 transition-transform hover:scale-150" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-4 !h-4 opacity-0 z-50 absolute -bottom-1" />

      <Handle type="target" position={Position.Left} id="left-target" className="!bg-gateway !w-2 !h-2 border-none ring-2 ring-bg-primary z-50 transition-transform hover:scale-150" />
      <Handle type="source" position={Position.Left} id="left-source" className="!w-4 !h-4 opacity-0 z-50 absolute -left-1" />

      <Handle type="target" position={Position.Right} id="right-target" className="!bg-gateway !w-2 !h-2 border-none ring-2 ring-bg-primary z-50 transition-transform hover:scale-150" />
      <Handle type="source" position={Position.Right} id="right-source" className="!w-4 !h-4 opacity-0 z-50 absolute -right-1" />
      
      <div className={`relative w-[180px] transition-all duration-300 ${selected ? 'scale-105' : ''}`}>
        {/* Routing bracket accents */}
        <div className="absolute top-0 -left-1 h-full w-[2px] bg-gradient-to-b from-gateway/0 via-gateway to-gateway/0"></div>
        <div className="absolute top-0 -right-1 h-full w-[2px] bg-gradient-to-b from-gateway/0 via-gateway to-gateway/0"></div>
        
        <div className={`relative overflow-hidden border-2 transition-all duration-500 
                        ${selected ? 'border-gateway shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 'border-gateway/40 shadow-xl'}
                        rounded-lg bg-bg-node-solid backdrop-blur-xl group-hover:border-gateway/80`}>
          
          {/* Active Routing Line */}
          <div className="h-1 bg-gradient-to-r from-transparent via-gateway to-transparent opacity-50"></div>
          
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
                className="bg-transparent border-b border-gateway text-[12px] font-black uppercase tracking-[0.15em] text-text-primary text-center leading-tight outline-none w-11/12"
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
              <span className="text-lg drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]">🔀</span>
              <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-yellow-500 rounded-full border border-bg-node-solid shadow-[0_0_10px_#eab308]"></div>
            </div>
          </div>

          <div className="h-[2px] bg-gradient-to-r from-gateway/0 via-gateway/20 to-gateway/0"></div>
        </div>
      </div>

      {/* Popover Endpoints & Stack */}
      {isOpen && (
        <div className="absolute top-full left-0 w-full mt-2 bg-bg-sidebar border border-border rounded-lg p-3 z-[1000] 
                        shadow-2xl animate-in fade-in zoom-in-95 duration-200 origin-top">
          
          <div className="flex justify-between items-center mb-2 border-b border-border-subtle pb-1.5">
            <div className="text-[10px] font-bold text-gateway uppercase tracking-tighter">
              Gateway Info
            </div>
            {data.language && (
              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-bg-badge text-text-secondary border border-border-subtle">
                {data.language}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto pr-1">
            {endpoints.length > 0 ? (
              endpoints.map(([id, ep]: any) => (
                <div key={id} className="flex flex-col gap-0.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className={`font-black uppercase text-[9px] ${
                      ep.method === 'GET' ? 'text-green-500' : ep.method === 'POST' ? 'text-blue-500' : 'text-orange-500'
                    }`}>{ep.method}</span>
                    <span className="text-text-primary font-mono truncate max-w-[120px]">{ep.path}</span>
                  </div>
                </div>
              ))
            ) : (
                <div className="text-[10px] text-text-secondary italic">No entry routes</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(GatewayNode);
