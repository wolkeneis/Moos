import admin, { ServiceAccount } from "firebase-admin";
import serviceAccount from "./security/service-account.json";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as ServiceAccount),
  databaseURL: "https://wolkeneis-default-rtdb.europe-west1.firebasedatabase.app"
});

const database = admin.database();
const firestore = admin.firestore();

export default admin;
export { database, firestore };
