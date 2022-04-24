import { FirestoreStore } from "./database";
import session from "express-session";
import { firestore } from "./firebase";
import "./environment";
import { env, envRequire } from "./environment";

export const sessionMiddleware = session({
  store: new FirestoreStore({
    database: firestore,
    collection: "Sessions"
  }),
  secret: envRequire("SESSION_SECRET"),
  resave: true,
  saveUninitialized: true,
  cookie: {
    path: "/",
    sameSite: env("NODE_ENV") !== "development" ? "none" : "lax",
    httpOnly: true,
    secure: env("NODE_ENV") !== "development",
    maxAge: 604800000
  }
});
