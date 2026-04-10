import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export const yDoc = new Y.Doc();

export const provider = new WebsocketProvider(
  import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws',
  'archflow-main',
  yDoc
);

export const servicesMap      = yDoc.getMap('services');
export const contractsMap     = yDoc.getMap('contracts');
export const datastoresMap    = yDoc.getMap('datastores');
export const canvasPositionsMap = yDoc.getMap('canvasPositions');
export const annotationsMap   = yDoc.getMap('annotations');  // Sticky notes, groups, labels

// UndoManager tracks all structural maps (not positions — position undo is jarring)
export const undoManager = new Y.UndoManager(
  [servicesMap, contractsMap, datastoresMap, annotationsMap],
  { captureTimeout: 500 }
);
