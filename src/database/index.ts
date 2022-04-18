import { database } from "firebase";
import DatabaseAdapterInterface from "./database-adapter";
import RealtimeDatabaseImpl from "./realtime-database";

const defaultImpl: DatabaseAdapterInterface = new RealtimeDatabaseImpl(database);

export default defaultImpl;
export type DatabaseAdapter = DatabaseAdapterInterface;
