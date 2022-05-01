import csurf from "csurf";
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
