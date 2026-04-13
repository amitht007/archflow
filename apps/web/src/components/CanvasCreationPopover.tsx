import React, { useState, useEffect, useRef } from 'react';

interface Props {
  x: number;
  y: number;
  onClose: () => void;
  onSubmit: (type: string, name: string, subtype?: string) => void;
}

export const CanvasCreationPopover = ({ x, y, onClose, onSubmit }: Props) => {
  const [type, setType] = useState('service');
  const [name, setName] = useState('');
  const [subtype, setSubtype] = useState('postgresql');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Don't close if clicking inside this popover.
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };

    // Small delay to prevent immediate clicking from triggering close
    setTimeout(() => {
      document.addEventListener('mousedown', handler);
      document.addEventListener('keydown', esc);
    }, 10);

    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', esc);
    };
  }, [onClose]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    // For standard nodes we can just submit type and name
    onSubmit(type, name.trim(), type === 'database' ? subtype : undefined);
    onClose();
  };

  const types = [
    { id: 'service', label: 'Service', icon: '▭' },
    { id: 'gateway', label: 'Gateway', icon: '◇' },
    { id: 'database', label: 'Database', icon: '🛢️' },
    { id: 'external', label: 'External', icon: '○' },
    { id: 'lambda', label: 'Lambda', icon: '⊂⊃' },
    { id: 'group', label: 'Domain', icon: '⬚' },
    { id: 'sticky', label: 'Sticky Note', icon: '📝' },
  ];

  return (
    <div
      ref={ref}
      style={{ position: 'fixed', left: x, top: y, zIndex: 9999 }}
      className="bg-bg-sidebar/95 backdrop-blur-xl border border-border-subtle rounded-xl shadow-2xl p-4 w-72
                 animate-in fade-in zoom-in-95 duration-150 origin-top-left"
    >
      <h3 className="text-sm font-bold uppercase tracking-widest text-text-primary mb-3 flex items-center justify-between">
        Add Node
        <button type="button" onClick={onClose} className="text-text-secondary hover:text-white transition-colors">✕</button>
      </h3>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold text-text-secondary tracking-widest">Type</label>
          <div className="relative">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm appearance-none
                         text-text-primary focus:outline-none focus:border-service/50 transition-colors cursor-pointer"
            >
              {types.map((t) => (
                <option key={t.id} value={t.id} className="bg-bg-sidebar text-text-primary">
                  {t.icon} {t.label}
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
              ▼
            </div>
          </div>
        </div>

        {type === 'database' && (
          <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1">
            <label className="text-[10px] uppercase font-bold text-text-secondary tracking-widest">Database Engine</label>
            <div className="relative">
              <select
                value={subtype}
                onChange={(e) => setSubtype(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm appearance-none
                           text-text-primary focus:outline-none focus:border-service/50 transition-colors cursor-pointer"
              >
                <option value="postgresql" className="bg-bg-sidebar">PostgreSQL</option>
                <option value="mongodb" className="bg-bg-sidebar">MongoDB</option>
                <option value="redis" className="bg-bg-sidebar">Redis</option>
                <option value="s3" className="bg-bg-sidebar">S3 / Blob</option>
                <option value="kafka" className="bg-bg-sidebar">Kafka / Queue</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
                ▼
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold text-text-secondary tracking-widest">Name / Label</label>
          <input
            ref={inputRef}
            type="text"
            placeholder={type === 'sticky' ? 'Enter note text...' : 'e.g. User Service'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm
                       text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-service/50 transition-colors"
          />
        </div>

        <button
          type="submit"
          className="mt-2 w-full bg-service/20 text-service hover:bg-service/30 border border-service/30 
                     py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest transition-all active:scale-95"
        >
          Create Form
        </button>
      </form>
    </div>
  );
};
