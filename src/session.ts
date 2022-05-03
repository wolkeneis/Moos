import { verifyCookie } from "./auth";
import csurf from "csurf";
import { Request, RequestHandler } from "express";
import "./environment";
import { env } from "./environment";

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
  return (req, res, next) => {
  if (req.cookies.session) {
    verifyCookie(req.cookies.session).then((token) => {
      if (token) {
        req.token = token;
        next();
      } else {
        if (redirect) {
          res.redirect(redirect);
        } else {
          res.sendStatus(403);
        }
      }
    });
  }
};
}
