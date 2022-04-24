import { SessionData, Store } from "express-session";
import { Firestore } from "firebase-admin/firestore";

export interface StoreOptions {
  database: Firestore;
  collection?: string;
}

export default class FirestoreStore extends Store {
  database: Firestore;
  collection: string;
  constructor(options: StoreOptions) {
    super();
    this.database = options.database;
    if (!this.database) {
      throw new Error("No dataset provided to Firestore Session.");
    }
    this.collection = options.collection || "Session";
  }

  get = (sid: string, callback: (error?: Error | null, session?: SessionData) => void) => {
    this.database
      .collection(this.collection)
      .doc(sid)
      .get()
      .then((document) => {
        if (!document.exists) {
          return callback();
        }

        try {
          const data = document.data();
          if (!data) {
            throw new Error("A database error occurred.");
          }
          const result = JSON.parse(data.data);
          return callback(null, result);
        } catch (error) {
          return callback(error as Error);
        }
      }, callback);
  };

  set = (sid: string, session: SessionData, callback?: (error?: Error) => void) => {
    let sessionJson;

    try {
      sessionJson = JSON.stringify(session);
    } catch (error) {
      return callback ? (error as Error) : null;
    }

    this.database
      .collection(this.collection)
      .doc(sid)
      .set({ data: sessionJson })
      .then(() => {
        callback!();
      });
  };

  destroy = (sid: string, callback?: (error?: Error) => void) => {
    this.database
      .collection(this.collection)
      .doc(sid)
      .delete()
      .then(() => (callback ? undefined : null), callback);
  };
}
