import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const ServiceNode = ({ data, selected }: NodeProps) => {
  const [hovered, setHovered] = useState(false);
  const endpoints = Object.entries(data.endpoints || {});
  return (
    <div 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative px-0 rounded-xl bg-bg-node backdrop-blur-md border transition-all duration-300 min-w-[180px] 
                    ${selected ? 'border-service shadow-[0_0_0_2px_rgba(59,130,246,0.3)]' : 'border-border shadow-lg'}
                    border-l-[4px] border-l-service bg-bg-node-solid`}>
      <Handle type="target" position={Position.Top} id="t" title="Top" className="!bg-service !w-1.5 !h-1.5" />
      <Handle type="source" position={Position.Bottom} id="b" title="Bottom" className="!bg-service !w-1.5 !h-1.5" />
      <Handle type="target" position={Position.Left} id="l" title="Left" className="!bg-service !w-1.5 !h-1.5" />
      <Handle type="source" position={Position.Right} id="r" title="Right" className="!bg-service !w-1.5 !h-1.5" />
      
      <div className="p-3 flex items-center justify-center gap-2">
        <span className="text-lg">🚀</span>
        <span className="text-[11px] font-bold tracking-tight text-text-primary truncate">{data.displayName}</span>
      </div>

      {/* Popover Endpoints & Stack */}
      {hovered && (
        <div className="absolute top-full left-0 w-full mt-2 bg-bg-sidebar border border-border rounded-lg p-3 z-[1000] 
                        shadow-2xl animate-in fade-in zoom-in-95 duration-200 origin-top">
          
          <div className="flex justify-between items-center mb-2 border-b border-border-subtle pb-1.5">
            <div className="text-[10px] font-bold text-service uppercase tracking-tighter">
              Service Info
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
                <div className="text-[10px] text-text-secondary italic">No endpoints defined</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(ServiceNode);
