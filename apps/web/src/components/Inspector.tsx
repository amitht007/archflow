import React, { useEffect, useState } from 'react';
import { useSelectionStore } from '../store/selectionStore';
import { servicesMap, contractsMap, datastoresMap } from '../lib/yjs';
import * as Y from 'yjs';
import { SDLParser } from '../../../../packages/sdl/src/SDLParser';
import Editor from '@monaco-editor/react';
import { X, Plus, Trash2, Server, Key, ArrowRight, Activity, Database, FileJson, Settings } from 'lucide-react';

const parser = new SDLParser();

const Inspector: React.FC = () => {
  const { selectedId, selectedType, clearSelection } = useSelectionStore();
  const [data, setData] = useState<any>(null);
  
  // Re-render when Yjs map changes
  useEffect(() => {
    if (!selectedId) return;

    let targetMap: Y.Map<any>;
    if (selectedType === 'contract') targetMap = contractsMap;
    else if (selectedType === 'datastore') targetMap = datastoresMap;
    else targetMap = servicesMap;

    const mapItem = targetMap.get(selectedId);
    if (mapItem instanceof Y.Map) {
      setData(mapItem.toJSON());
      
      const observer = () => {
        setData(mapItem.toJSON());
      };
      mapItem.observeDeep(observer);
      return () => mapItem.unobserveDeep(observer);
    }
  }, [selectedId, selectedType]);

  if (!selectedId || !data) return null;

  const updateField = (path: string[], value: any) => {
    let targetMap: Y.Map<any>;
    if (selectedType === 'contract') targetMap = contractsMap;
    else if (selectedType === 'datastore') targetMap = datastoresMap;
    else targetMap = servicesMap;

    const mapItem = targetMap.get(selectedId);
    if (!(mapItem instanceof Y.Map)) return;

    // Traverse and update handling simple nested Y.Maps. 
    // For arrays or deep objects inside our struct, we may need to replace them.
    if (path.length === 1) {
      mapItem.set(path[0], value);
    } else if (path.length === 2) {
      // Very basic handling for 2-level nesting like stack.language
      let nested = mapItem.get(path[0]);
      if (!(nested instanceof Y.Map)) {
        nested = new Y.Map();
        mapItem.set(path[0], nested);
      }
      nested.set(path[1], value);
    }

    // Special case for morphing: 'external' implies owned=false
    if (path[0] === 'type') {
      mapItem.set('owned', value !== 'external');
    }
  };

  const updateEndpoint = (endpointPath: string, key: string, value: any) => {
    const mapItem = servicesMap.get(selectedId);
    if (mapItem) {
      let eps = mapItem.get('endpoints');
      if (!(eps instanceof Y.Map)) {
        eps = new Y.Map();
        mapItem.set('endpoints', eps);
      }
      let ep = eps.get(endpointPath);
      if (!(ep instanceof Y.Map)) {
        ep = new Y.Map();
        eps.set(endpointPath, ep);
      }
      ep.set(key, value);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-transparent">
      <div className="flex justify-between items-center p-5 border-b border-white/5">
        <h2 className="m-0 text-sm tracking-wider uppercase font-bold flex items-center gap-2 text-text-primary">
          {selectedType === 'service' || selectedType === 'gateway' || selectedType === 'external' ? <Server size={16} className="text-service" /> : null}
          {selectedType === 'contract' ? <ArrowRight size={16} className="text-contract" /> : null}
          {selectedType === 'datastore' ? <Database size={16} className="text-database" /> : null}
          {selectedType === 'contract' ? 'Contract Details' : 'Node Properties'}
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              const confirm = window.confirm(`Permanently delete ${selectedId}?`);
              if (!confirm) return;
              
              const targetMap = selectedType === 'contract' ? contractsMap : (selectedType === 'datastore' ? datastoresMap : servicesMap);
              targetMap.delete(selectedId);
              clearSelection();
            }}
            className="p-1.5 rounded hover:bg-red-500/20 text-text-secondary hover:text-red-500 transition-all"
            title="Delete this node"
          >
            <Trash2 size={16} />
          </button>
          <button onClick={clearSelection} className="text-text-secondary hover:text-text-primary transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-6 no-scrollbar">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-text-secondary mb-1">ID</label>
            <div className="text-xs font-mono bg-black/20 p-2 rounded text-text-primary border border-white/5">{selectedId}</div>
          </div>
          
          {(selectedType === 'service' || selectedType === 'gateway' || selectedType === 'external') && (
            <>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-text-secondary mb-1">Display Name</label>
                <input 
                  type="text" 
                  value={data.displayName || data.name || ''} 
                  onChange={(e) => updateField(['displayName'], e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm text-text-primary focus:outline-none focus:border-service/50 transition-colors"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] uppercase tracking-wider text-text-secondary mb-1">Type</label>
                  <select 
                    value={data.type || 'service'}
                    onChange={(e) => updateField(['type'], e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm text-text-primary focus:outline-none"
                  >
                    <option value="service" className="text-black">Service</option>
                    <option value="gateway" className="text-black">Gateway</option>
                    <option value="external" className="text-black">External</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] uppercase tracking-wider text-text-secondary mb-1">Team</label>
                  <input 
                    type="text" 
                    value={data.team || ''} 
                    onChange={(e) => updateField(['team'], e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm text-text-primary focus:outline-none"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-text-secondary mb-1">Language</label>
                <input 
                  type="text" 
                  value={data.stack?.language || ''} 
                  onChange={(e) => updateField(['stack', 'language'], e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm text-text-primary focus:outline-none"
                />
              </div>

              <div className="mt-6 pt-6 border-t border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs uppercase tracking-wider font-bold text-text-primary flex items-center gap-2">
                    <Activity size={14} className="text-frontend" /> Endpoints Manager
                  </h3>
                  <button 
                    onClick={() => updateEndpoint(`/api/new-${Date.now()}`, 'method', 'GET')}
                    className="text-[10px] bg-white/10 hover:bg-white/20 transition-colors px-2 py-1 rounded flex items-center gap-1"
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>

                <div className="space-y-3">
                  {Object.entries(data.endpoints || {}).map(([epath, epData]: [string, any]) => (
                    <div key={epath} className="bg-black/20 border border-white/5 rounded-lg overflow-hidden">
                      <div className="flex p-2 gap-2 border-b border-white/5 bg-white/5 items-center">
                        <select 
                          value={epData?.method || 'GET'}
                          onChange={(e) => updateEndpoint(epath, 'method', e.target.value)}
                          className="bg-transparent text-xs font-bold w-20 outline-none"
                          style={{
                            color: epData?.method === 'GET' ? '#3b82f6' : epData?.method === 'POST' ? '#10b981' : '#eab308'
                          }}
                        >
                          <option className="text-black">GET</option>
                          <option className="text-black">POST</option>
                          <option className="text-black">PUT</option>
                          <option className="text-black">DELETE</option>
                        </select>
                        <input 
                          value={epath}
                          disabled
                          className="bg-transparent text-xs text-text-primary flex-1 font-mono outline-none opacity-50"
                        />
                        <button 
                          onClick={() => {
                            const mapItem = servicesMap.get(selectedId);
                            if (mapItem instanceof Y.Map) {
                              const eps = mapItem.get('endpoints');
                              if (eps instanceof Y.Map) eps.delete(epath);
                            }
                          }}
                          className="p-1 rounded hover:bg-red-500/20 text-text-secondary hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                        <div className="p-3">
                          <label className="flex items-center justify-between text-[10px] uppercase text-text-secondary mb-2">
                            <span className="flex items-center gap-1"><FileJson size={10} /> Request Payload</span>
                          </label>
                          <div className="h-32 border border-white/10 rounded overflow-hidden">
                            <Editor
                              height="100%"
                              defaultLanguage="json"
                              theme="vs-dark"
                              value={JSON.stringify(epData?.request || {}, null, 2)}
                              onChange={(val) => {
                                try {
                                  const parsed = JSON.parse(val || '{}');
                                  const requestMap = parser.toYjsType(parsed);
                                  updateEndpoint(epath, 'request', requestMap);
                                } catch(e) { /* ignore parse errors while typing */ }
                              }}
                              options={{ minimap: { enabled: false }, fontSize: 11, lineNumbers: 'off', scrollBeyondLastLine: false }}
                            />
                          </div>

                          <label className="flex items-center justify-between text-[10px] uppercase text-text-secondary mb-2 mt-4">
                            <span className="flex items-center gap-1"><FileJson size={10} /> Responses</span>
                          </label>
                          <div className="h-32 border border-white/10 rounded overflow-hidden">
                            <Editor
                              height="100%"
                              defaultLanguage="json"
                              theme="vs-dark"
                              value={JSON.stringify(epData?.responses || {}, null, 2)}
                              onChange={(val) => {
                                try {
                                  const parsed = JSON.parse(val || '{}');
                                  const responseMap = parser.toYjsType(parsed);
                                  updateEndpoint(epath, 'responses', responseMap);
                                } catch(e) { /* ignore parse errors while typing */ }
                              }}
                              options={{ minimap: { enabled: false }, fontSize: 11, lineNumbers: 'off', scrollBeyondLastLine: false }}
                            />
                          </div>
                        </div>
                    </div>
                  ))}
                  {Object.keys(data.endpoints || {}).length === 0 && (
                    <div className="text-xs text-text-secondary text-center p-4 border border-white/5 rounded border-dashed">
                      No endpoints defined for this service.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {selectedType === 'contract' && (
            <>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-text-secondary mb-1">Pattern / Operation</label>
                <input 
                  type="text" 
                  value={data.pattern || ''} 
                  onChange={(e) => updateField(['pattern'], e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm text-text-primary focus:outline-none"
                  placeholder="e.g. create_user or POST /users"
                />
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] uppercase tracking-wider text-text-secondary mb-1">Timeout (ms)</label>
                  <input 
                    type="number" 
                    value={data.timeout || 3000} 
                    onChange={(e) => updateField(['timeout'], parseInt(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm text-text-primary focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] uppercase tracking-wider text-text-secondary mb-1">Retries</label>
                  <input 
                    type="number" 
                    value={data.retry?.attempts || 0} 
                    onChange={(e) => updateField(['retry', 'attempts'], parseInt(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm text-text-primary focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-text-secondary mb-1">Protocol</label>
                <select 
                  value={data.protocol || 'REST'}
                  onChange={(e) => updateField(['protocol'], e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm text-text-primary focus:outline-none"
                >
                  <option className="text-black">REST</option>
                  <option className="text-black">gRPC</option>
                  <option className="text-black">Kafka</option>
                  <option className="text-black">GraphQL</option>
                </select>
              </div>

              <div className="bg-contract/10 border border-contract/30 p-3 rounded mt-4">
                <div className="text-[10px] text-contract uppercase font-bold mb-1 flex items-center gap-1">
                  <Settings size={12} /> Target Endpoint Binding
                </div>
                <p className="text-xs text-text-secondary">
                  Connect this contract specifically to an endpoint on the target service.
                </p>
                <select 
                  value={data.targetEndpoint || ''}
                  onChange={(e) => updateField(['targetEndpoint'], e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded p-2 text-sm text-text-primary mt-2 outline-none"
                >
                  <option value="" className="text-black">-- Select Target Endpoint --</option>
                  {/* Ideally, we query the target service's endpoints here. For now, freeform or basic. */}
                  {data.to && servicesMap.get(`svc_${data.to}`) instanceof Y.Map 
                    ? Object.keys((servicesMap.get(`svc_${data.to}`) as Y.Map<any>)?.get('endpoints')?.toJSON() || {}).map(ep => (
                      <option key={ep} value={ep} className="text-black">{ep}</option>
                  )) : null}
                </select>
              </div>
            </>
          )}

          {selectedType === 'datastore' && (
            <>
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-text-secondary mb-1">Display Name</label>
                <input 
                  type="text" 
                  value={data.displayName || ''} 
                  onChange={(e) => updateField(['displayName'], e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm text-text-primary focus:outline-none"
                />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] uppercase tracking-wider text-text-secondary mb-1">Engine</label>
                  <input 
                    type="text" 
                    value={data.engine || ''} 
                    onChange={(e) => updateField(['engine'], e.target.value)}
                    placeholder="e.g. PostgreSQL"
                    className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm text-text-primary focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inspector;
