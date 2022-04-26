import csurf from "csurf";
import session from "express-session";
import { FirestoreStore } from "./database";
import "./environment";
import { env, envRequire } from "./environment";
import { firestore } from "./firebase";

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

export const csrfMiddleware = csurf({
  cookie: {
    path: "/",
    sameSite: env("NODE_ENV") !== "development" ? "none" : "lax",
    httpOnly: false,
    secure: env("NODE_ENV") !== "development",
    maxAge: 604800000
  }
});
