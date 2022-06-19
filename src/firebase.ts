import admin, { ServiceAccount } from "firebase-admin";
import { env, envRequire } from "./environment.js";

const app = admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(envRequire("SERVICE_ACCOUNT")) as ServiceAccount),
  databaseURL: env("DATABASE_URL") ?? "https://wolkeneis-default-rtdb.europe-west1.firebasedatabase.app"
});

const auth = app.auth();
const database = app.database();
const firestore = app.firestore();

export default app;
export { auth, database, firestore };
