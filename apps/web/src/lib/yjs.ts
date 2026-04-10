import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export const yDoc = new Y.Doc();

export const provider = new WebsocketProvider(
  import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws',
  'archflow-main',
  yDoc
);

export const servicesMap = yDoc.getMap('services');
export const contractsMap = yDoc.getMap('contracts');
export const datastoresMap = yDoc.getMap('datastores');
export const canvasPositionsMap = yDoc.getMap('canvasPositions');
