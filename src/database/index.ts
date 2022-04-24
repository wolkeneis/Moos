import { database } from "../firebase";
import DatabaseAdapterInterface from "./database-adapter";
import RealtimeDatabaseImpl from "./realtime-database";
import FirestoreStore from "./firestore-store";

const defaultImpl: DatabaseAdapterInterface = new RealtimeDatabaseImpl(database);

export default defaultImpl;
export type DatabaseAdapter = DatabaseAdapterInterface;
export { FirestoreStore };
