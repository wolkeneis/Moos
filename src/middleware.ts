import csurf from "csurf";
import { RequestHandler } from "express";
import { verifyCookie } from "./auth";
import "./environment";
import { env } from "./environment";
import database from "./database";

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
        if (redirect) {
          return res.redirect(redirect);
        } else {
          return res.sendStatus(403);
        }
      }
    }
  };
};