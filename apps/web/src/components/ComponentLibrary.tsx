import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface PaletteItem {
  type: string;
  subtype?: string;
  label: string;
  icon: string;
  description: string;
  color: string;
}

const PALETTE: { section: string; items: PaletteItem[] }[] = [
  {
    section: 'Shapes',
    items: [
      { type: 'service',  label: 'Rectangle',       icon: '▭', description: 'Generic compute',    color: 'text-blue-400'   },
      { type: 'database', subtype: 'generic', label: 'Cylinder', icon: '🛢️', description: 'Datastore / state',  color: 'text-yellow-400' },
      { type: 'external', label: 'Circle / Node',   icon: '○', description: 'External / Network',  color: 'text-gray-400'   },
      { type: 'gateway',  label: 'Diamond',         icon: '◇', description: 'Router / condition',  color: 'text-purple-400' },
      { type: 'lambda',   label: 'Pill / Lambda',   icon: '⊂⊃', description: 'Function execute', color: 'text-orange-400' },
    ],
  },
  {
    section: 'Containers',
    items: [
      { type: 'group',    label: 'Region / Box',    icon: '⬚', description: 'Domain boundary',         color: 'text-white/40'   },
      { type: 'sticky',   label: 'Sticky Note',     icon: '📝', description: 'Add a note',             color: 'text-yellow-300' },
    ],
  },
];

// Encode drag data as a JSON string on the dataTransfer object
export function encodeDragData(item: PaletteItem) {
  return JSON.stringify(item);
}

export function decodeDragData(raw: string): PaletteItem | null {
  try { return JSON.parse(raw); } catch { return null; }
}

export interface PaletteItemType extends PaletteItem {}

interface Props {
  isOpen: boolean;
  onAddItem?: (item: PaletteItemType) => void;
}

const ComponentLibrary = ({ isOpen, onAddItem }: Props) => {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const toggle = (section: string) =>
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));

  return (
    <div className="flex flex-col h-full min-w-[220px] overflow-y-auto no-scrollbar">
      <div className="px-4 pt-5 pb-3 border-b border-white/5">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary">
          Component Library
        </h2>
        <p className="text-[10px] text-text-secondary/50 mt-0.5">Click or Drag onto canvas</p>
      </div>

      <div className="flex flex-col gap-1 p-2 flex-1">
        {PALETTE.map(({ section, items }) => (
          <div key={section}>
            {/* Section header */}
            <button
              onClick={() => toggle(section)}
              className="flex items-center justify-between w-full px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors rounded"
            >
              {section}
              {collapsed[section]
                ? <ChevronRight size={12} className="opacity-40" />
                : <ChevronDown  size={12} className="opacity-40" />
              }
            </button>

            {!collapsed[section] && (
              <div className="flex flex-col gap-0.5 mb-2">
                {items.map((item) => (
                  <div
                    key={`${item.type}-${item.subtype ?? item.label}`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/archflow', encodeDragData(item));
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => onAddItem?.(item)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/0 hover:bg-white/5
                               border border-transparent hover:border-white/10 cursor-pointer active:scale-[0.98]
                               transition-all duration-150 group select-none"
                  >
                    <span className={`text-base w-5 text-center ${item.color} flex-shrink-0`}>
                      {item.icon}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[11px] font-semibold text-text-primary leading-tight truncate">
                        {item.label}
                      </span>
                      <span className="text-[9px] text-text-secondary/60 leading-tight truncate">
                        {item.description}
                      </span>
                    </div>

                    {/* Drag grip indicator */}
                    <div className="ml-auto opacity-0 group-hover:opacity-30 flex flex-col gap-[3px]">
                      {[0,1,2].map((i) => (
                        <div key={i} className="flex gap-[3px]">
                          {[0,1].map((j) => (
                            <div key={j} className="w-[3px] h-[3px] rounded-full bg-white" />
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom tip */}
      <div className="px-4 py-3 border-t border-white/5">
        <p className="text-[9px] text-text-secondary/40 leading-snug">
          Tip: Right-click any node for options. Shift+click to multi-select. Cmd+Z to undo.
        </p>
      </div>
    </div>
  );
};

export default ComponentLibrary;
