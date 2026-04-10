import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const DatabaseNode = ({ data, selected }: NodeProps) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div 
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative bg-transparent border-none shadow-none backdrop-filter-none min-w-[180px] transition-all duration-300 ${hovered ? 'scale-[1.02]' : ''}`}
    >
      <Handle type="target" position={Position.Top} id="t" title="Top" className="!bg-database" />
      <Handle type="source" position={Position.Bottom} id="b" title="Bottom" className="!bg-database" />
      <Handle type="target" position={Position.Left} id="l" title="Left" className="!bg-database" />
      <Handle type="source" position={Position.Right} id="r" title="Right" className="!bg-database" />
      
      <div className={`flex flex-col w-[180px] transition-all duration-300 ${selected ? 'scale-105 filter drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]' : ''}`}>
        <div className="cylinder-top opacity-100 border-2 border-b-0 border-database bg-database/20"></div>
        <div className="cylinder-body border-2 border-t-0 border-database shadow-lg bg-bg-node-solid">
          <div className="flex items-center justify-center gap-2 py-3">
            <span className="text-xl">🗄️</span>
            <span className="text-sm font-bold tracking-tight text-text-primary">{data.displayName}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(DatabaseNode);
