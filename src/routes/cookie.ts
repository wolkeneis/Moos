import express, { Router } from "express";
import { auth } from "../firebase";
import { createCookie, verifyCookie } from "../auth";
import { env, envRequire } from "../environment";
import { csrfMiddleware } from "../middleware";

const router: Router = express.Router();

router.use(csrfMiddleware);

router.post("/request", (req, res) => {
  const token = req.body.token;
  if (!token) {
    return res.sendStatus(400);
  }
  createCookie(token).then((cookie) => {
    res
      .cookie("session", cookie, {
        path: "/",
        sameSite: "none",
        httpOnly: true,
        secure: env("NODE_ENV") !== "development",
        maxAge: 604800000
      })
      .status(204)
      .end();
  });
});

router.delete("/revoke", (req, res) => {
  const sessionCookie = req.cookies.session || "";
  res.clearCookie("session");
  return verifyCookie(sessionCookie)
    .then((decodedClaims) => {
      if (decodedClaims) {
        auth.revokeRefreshTokens(decodedClaims.sub);
      }
    })
    .catch(() => res.sendStatus(500))
    .then(() => res.sendStatus(204));
});

export default router;
