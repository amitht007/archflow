import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const DatabaseNode = ({ data, selected }: NodeProps) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div 
      className={`relative bg-transparent border-none shadow-none backdrop-filter-none min-w-[180px] group`}
    >
      <Handle type="target" position={Position.Top} id="top-target" className="!bg-database !w-2 !h-2 border-none ring-2 ring-bg-primary z-50 transition-transform hover:scale-150" />
      <Handle type="source" position={Position.Top} id="top-source" className="!w-4 !h-4 opacity-0 z-50 absolute -top-1" />

      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!bg-database !w-2 !h-2 border-none ring-2 ring-bg-primary z-50 transition-transform hover:scale-150" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-4 !h-4 opacity-0 z-50 absolute -bottom-1" />

      <Handle type="target" position={Position.Left} id="left-target" className="!bg-database !w-2 !h-2 border-none ring-2 ring-bg-primary z-50 transition-transform hover:scale-150" />
      <Handle type="source" position={Position.Left} id="left-source" className="!w-4 !h-4 opacity-0 z-50 absolute -left-1" />

      <Handle type="target" position={Position.Right} id="right-target" className="!bg-database !w-2 !h-2 border-none ring-2 ring-bg-primary z-50 transition-transform hover:scale-150" />
      <Handle type="source" position={Position.Right} id="right-source" className="!w-4 !h-4 opacity-0 z-50 absolute -right-1" />
      
      <div className={`relative flex flex-col w-[180px] transition-all duration-300 ${selected ? 'scale-105' : ''}`}>
        {/* Storage bracket accents */}
        <div className="absolute top-2 -left-1 w-2 h-[80%] border-l-2 border-database opacity-30"></div>
        <div className="absolute top-2 -right-1 w-2 h-[80%] border-r-2 border-database opacity-30"></div>
        
        <div className={`cylinder-top opacity-100 border-[1.5px] border-b-0 border-database/60 bg-gradient-to-t from-database/40 to-database/10`}></div>
        <div className={`cylinder-body border-[1.5px] border-t-0 border-database/60 shadow-2xl bg-bg-node-solid backdrop-blur-md transition-colors duration-300 group-hover:border-database`}>
          <div className="flex flex-col items-center justify-center gap-1.5 py-4 px-2">
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
                className={`bg-transparent border-b border-database text-[12px] font-black uppercase tracking-wider text-text-primary text-center w-full outline-none leading-tight`}
              />
            ) : (
              <span 
                onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                className="text-[12px] font-black uppercase tracking-wider text-text-primary text-center leading-tight cursor-text"
              >
                {data.displayName}
              </span>
            )}
            <span className="text-base drop-shadow-[0_0_8px_rgba(234,179,8,0.3)] opacity-70">🗄️</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(DatabaseNode);
