import { createRequire } from 'module';

// y-websocket v2 locks sub-paths via package.json#exports — use createRequire
// to load the CJS util directly by resolved filesystem path.
// NOTE: We intentionally do NOT import 'yjs' here. y-websocket/bin/utils.cjs
// carries its own bundled Yjs. Importing ESM yjs alongside it creates two
// separate Yjs instances, triggering the "Yjs was already imported" warning
// and breaking instanceof checks. Typing doc as `any` avoids this entirely.
const require = createRequire(import.meta.url);
const { setupWSConnection, setContentInitializor } = require(
  '../node_modules/y-websocket/bin/utils.cjs',
) as {
  setupWSConnection: (conn: any, req: any, opts?: any) => void;
  setContentInitializor: (fn: (doc: any) => Promise<void>) => void;
};

/**
 * Initialize the central Y.Doc structure for all rooms/workspaces.
 * This ensures every new document has the required Y.Maps.
 * doc is typed as `any` to avoid importing a second Yjs instance.
 */
setContentInitializor(async (doc: any) => {
  doc.getMap('services');
  doc.getMap('contracts');
  doc.getMap('types');
  doc.getMap('canvasPositions');
  console.log(`[Yjs] Document initialized with structural maps`);
});

/**
 * Shims Bun's ServerWebSocket to be compatible with y-websocket's expectations.
 * y-websocket expects a ws-like object with .on(), .send(), .close(), etc.
 */
class WSShim {
  constructor(public ws: any) {}

  get readyState() {
    return this.ws.readyState;
  }

  set binaryType(type: string) {
    // Bun handles binary types automatically, property exists for compatibility
  }

  send(message: Uint8Array) {
    try {
      this.ws.send(message);
    } catch (e) {
      this.ws.close();
    }
  }

  on(event: string, listener: any) {
    if (event === 'message') {
      this.ws.data.onMessage = listener;
    } else if (event === 'close') {
      this.ws.data.onClose = listener;
    } else if (event === 'pong') {
      this.ws.data.onPong = listener;
    }
  }

  ping() {
    try {
      this.ws.ping();
    } catch (e) {
      this.ws.close();
    }
  }

  close() {
    this.ws.close();
  }
}

export const websocketHandlers = {
  open(ws: any) {
    const room = ws.data.room || 'default';
    const shim = new WSShim(ws);
    
    // setupWSConnection(conn, req, options)
    // We pass a mock request object with the room name
    setupWSConnection(shim, { url: `/${room}` }, { docName: room });
    
    console.log(`[WS] Client joined room: ${room}`);
  },
  
  message(ws: any, message: string | Buffer | Uint8Array) {
    // If message is a string, convert to Uint8Array as y-websocket expects binary
    const data = typeof message === 'string' ? new TextEncoder().encode(message) : message;
    
    if (ws.data.onMessage) {
      ws.data.onMessage(data);
    }
  },

  pong(ws: any) {
    if (ws.data.onPong) {
      ws.data.onPong();
    }
  },
  
  close(ws: any) {
    if (ws.data.onClose) {
      ws.data.onClose();
    }
    console.log(`[WS] Client left room: ${ws.data.room}`);
  }
};
