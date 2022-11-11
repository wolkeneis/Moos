import csurf from "@wolkeneis/csurf";
import express, { RequestHandler } from "express";
import session from "express-session";
import passport from "passport";
import { verifyCookie } from "./auth.js";
import database from "./database/index.js";
import "./environment.js";
import { env, envRequire } from "./environment.js";
import { firestore } from "./firebase.js";
import FirestoreStore from "./firestore-sesison.js";

export const sessionMiddleware: express.RequestHandler = session({
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

export const passportMiddleware: RequestHandler = passport.initialize();

export const csurfMiddleware: RequestHandler = csurf({
  cookie: {
    path: "/",
    httpOnly: true,
    sameSite: "none",
    key: "__csrf",
    secure: env("NODE_ENV") !== "development",
    maxAge: 604800000
  }
});

export const ensureLoggedIn = (redirect?: string): RequestHandler => {
  return async (req, res, next) => {
    if (req.cookies.session) {
      const token = await verifyCookie(req.cookies.session);
      if (token) {
        req.token = token;
        try {
          const profile = await database.userFindById({
            uid: token.uid
          });
          req.user = profile;
          return next();
        } catch (error) {
          return next("User not found");
        }
      } else {
        if (redirect && req.method === "GET") {
          return res.redirect(redirect);
        } else {
          return res.sendStatus(403);
        }
      }
    } else {
      return res.sendStatus(401);
    }
  };
};
