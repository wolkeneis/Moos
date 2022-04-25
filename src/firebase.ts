import admin, { ServiceAccount } from "firebase-admin";
import serviceAccount from "./security/service-account.json";

const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as ServiceAccount),
  databaseURL: "https://wolkeneis-default-rtdb.europe-west1.firebasedatabase.app"
});

const auth = app.auth();
const database = app.database();
const firestore = app.firestore();

export default app;
export { auth, database, firestore };
