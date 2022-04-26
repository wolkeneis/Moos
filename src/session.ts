import csurf from "csurf";
import session from "express-session";
import { DecodedIdToken } from "firebase-admin/lib/auth/token-verifier";
import { FirestoreStore } from "./database";
import "./environment";
import { env, envRequire } from "./environment";
import { auth, firestore } from "./firebase";

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

export function verifyCookie(cookie: string): Promise<DecodedIdToken | null> {
  return auth.verifySessionCookie(cookie, true).catch(() => null);
}

export function createCookie(token: string): Promise<string> {
  return auth.createSessionCookie(token, {
    expiresIn: 604800000
  });
}

export function createToken(uid: string): Promise<string> {
  return auth.createCustomToken(uid);
}

export function verifyToken(token: string): Promise<DecodedIdToken | null> {
  return auth.verifyIdToken(token).catch(() => null);
}
