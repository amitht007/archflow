import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const ExternalNode = ({ data, selected }: NodeProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const endpoints = Object.entries(data.endpoints || {});
  return (
    <div 
      onDoubleClick={() => setIsOpen(!isOpen)}
      className={`relative px-0 transition-all duration-300 min-w-[180px] group`}>
      <Handle type="target" position={Position.Top} id="t" title="Top" className="!bg-external" />
      <Handle type="source" position={Position.Bottom} id="b" title="Bottom" className="!bg-external" />
      <Handle type="target" position={Position.Left} id="l" title="Left" className="!bg-external" />
      <Handle type="source" position={Position.Right} id="r" title="Right" className="!bg-external" />
      <div className={`flex flex-col w-[180px] transition-all duration-300 ${selected ? 'scale-105 filter drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]' : ''}`}>
        <div className="cylinder-top opacity-100 border-2 border-b-0 border-external bg-external/20"></div>
        <div className="cylinder-body border-2 border-t-0 border-external shadow-lg bg-bg-node-solid">
          <div className="flex items-center justify-center gap-2 py-3">
            <span className="text-xl opacity-80">🌐</span>
            <span className="text-sm font-bold tracking-tight text-text-secondary">{data.displayName}</span>
          </div>
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
