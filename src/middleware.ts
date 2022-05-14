import csurf from "csurf";
import { RequestHandler } from "express";
import session from "express-session";
import passport from "passport";
import { verifyCookie } from "./auth";
import database from "./database";
import "./environment";
import { env, envRequire } from "./environment";
import { firestore } from "./firebase";
import FirestoreStore from "./firestore-sesison";

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

export const passportMiddleware = passport.initialize();

export const csrfMiddleware = csurf({
  cookie: {
    path: "/",
    sameSite: "none",
    httpOnly: true,
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
