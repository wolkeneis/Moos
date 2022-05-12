import admin, { ServiceAccount } from "firebase-admin";

const app = admin.initializeApp({
  credential: admin.credential.cert(
    (process.env.SERVICE_ACCOUNT ? (JSON.parse(process.env.SERVICE_ACCOUNT) as ServiceAccount) : undefined) ??
      (import("./security/service-account.json") as ServiceAccount)
  ),
  databaseURL: "https://wolkeneis-default-rtdb.europe-west1.firebasedatabase.app"
});

const auth = app.auth();
const database = app.database();
const firestore = app.firestore();

export default app;
export { auth, database, firestore };
