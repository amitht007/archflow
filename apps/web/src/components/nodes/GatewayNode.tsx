import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const GatewayNode = ({ data, selected }: NodeProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const endpoints = Object.entries(data.endpoints || {});
  return (
    <div 
      onDoubleClick={() => setIsOpen(!isOpen)}
      className={`relative px-0 transition-all duration-300 min-w-[180px] group`}>
      <Handle type="target" position={Position.Top} id="t" title="Top" className="!bg-gateway !w-1.5 !h-1.5" />
      <Handle type="source" position={Position.Bottom} id="b" title="Bottom" className="!bg-gateway !w-1.5 !h-1.5" />
      <Handle type="target" position={Position.Left} id="l" title="Left" className="!bg-gateway !w-1.5 !h-1.5" />
      <Handle type="source" position={Position.Right} id="r" title="Right" className="!bg-gateway !w-1.5 !h-1.5" />
      
      <div className={`flex flex-col w-[180px] transition-all duration-300 ${selected ? 'scale-105 filter drop-shadow-[0_0_10px_rgba(168,85,247,0.4)]' : ''}`}>
        <div className="cylinder-top opacity-100 border-2 border-b-0 border-gateway bg-gateway/20"></div>
        <div className="cylinder-body border-2 border-t-0 border-gateway shadow-lg bg-bg-node-solid">
          <div className="flex items-center justify-center gap-2 py-3">
            <span className="text-xl">🔀</span>
            <span className="text-sm font-bold tracking-tight text-text-primary">{data.displayName}</span>
          </div>
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
