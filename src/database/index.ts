import { database } from "../firebase.js";
import type DatabaseAdapterInterface from "./database-adapter.js";
import RealtimeDatabaseImpl from "./realtime-database.js";

const defaultImpl: DatabaseAdapterInterface = new RealtimeDatabaseImpl(database);

export default defaultImpl;
export type DatabaseAdapter = DatabaseAdapterInterface;
