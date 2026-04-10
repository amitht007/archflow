import * as Y from "yjs";

/**
 * SDLParser handles bidirectional conversion between ArchFlow's proprietary SDL JSON format
 * and Yjs shared maps for real-time collaboration.
 */
export class SDLParser {
  /**
   * Produces the proprietary ArchFlow SDL JSON format from Yjs maps.
   * @param yDoc The Yjs document containing the architecture maps.
   * @returns A plain object representing the ArchFlow SDL.
   */
  public toSDL(yDoc: Y.Doc): any {
    const types = yDoc.getMap("types").toJSON();
    const services = yDoc.getMap("services").toJSON();
    const datastores = yDoc.getMap("datastores").toJSON();
    const contracts = yDoc.getMap("contracts").toJSON();

    // ArchFlow SDL format expectations
    return {
      types: Object.keys(types).length > 0 ? types : {},
      services: Object.keys(services).length > 0 ? services : {},
      datastores: Object.keys(datastores).length > 0 ? datastores : {},
      contracts: Object.keys(contracts).length > 0 ? contracts : {},
    };
  }

  /**
   * Populates Yjs maps from an SDL JSON object.
   * @param json The ArchFlow SDL JSON object.
   * @param yDoc The Yjs document to populate.
   */
  public fromSDL(json: any, yDoc: Y.Doc): void {
    if (!json || typeof json !== "object") {
      throw new Error("Invalid SDL JSON: must be an object");
    }

    yDoc.transact(() => {
      if (json.types) {
        const typesMap = yDoc.getMap("types");
        for (const [key, value] of Object.entries(json.types)) {
          const id = this.ensurePrefix(key, "t_");
          typesMap.set(id, this.toYjsType(value));
        }
      }

      if (json.services) {
        const servicesMap = yDoc.getMap("services");
        for (const [key, value] of Object.entries(json.services)) {
          const id = this.ensurePrefix(key, "svc_");
          servicesMap.set(id, this.toYjsType(value));
        }
      }

      if (json.datastores) {
        const datastoresMap = yDoc.getMap("datastores");
        for (const [key, value] of Object.entries(json.datastores)) {
          // Datastores can have different prefixes: db_, cache_, queue_
          const id = this.ensureDatastoreID(key);
          datastoresMap.set(id, this.toYjsType(value));
        }
      }

      if (json.contracts) {
        const contractsMap = yDoc.getMap("contracts");
        for (const [key, value] of Object.entries(json.contracts)) {
          const id = this.ensurePrefix(key, "c_");
          contractsMap.set(id, this.toYjsType(value));
        }
      }
    });
  }

  /**
   * Recursively converts a plain JS object/array to Yjs types.
   * This ensures that nested structures are collaboratively editable.
   */
  private toYjsType(value: any): any {
    if (Array.isArray(value)) {
      const yArray = new Y.Array();
      yArray.push(value.map((v) => this.toYjsType(v)));
      return yArray;
    } else if (value !== null && typeof value === "object") {
      // If it's already a Yjs type, return it (though fromSDL normally receives plain JSON)
      if (value instanceof Y.AbstractType) return value;

      const yMap = new Y.Map();
      for (const [k, v] of Object.entries(value)) {
        yMap.set(k, this.toYjsType(v));
      }
      return yMap;
    }
    return value;
  }

  /**
   * Ensures a string ID has the required prefix.
   */
  private ensurePrefix(id: string, prefix: string): string {
    if (id.startsWith(prefix)) return id;
    return `${prefix}${id}`;
  }

  /**
   * Special handler for datastore IDs which have multiple valid prefixes.
   */
  private ensureDatastoreID(id: string): string {
    const validPrefixes = ["db_", "cache_", "queue_"];
    if (validPrefixes.some((p) => id.startsWith(p))) return id;
    return `db_${id}`;
  }
}
