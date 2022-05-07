import express, { Router } from "express";
import { createCookie, verifyCookie } from "../../auth";
import { env } from "../../environment";
import { auth } from "../../firebase";
import { csrfMiddleware } from "../../middleware";

const router: Router = express.Router();

router.use(csrfMiddleware);

router.post("/request", async (req, res) => {
  const token = req.body.token;
  if (!token) {
    return res.sendStatus(400);
  }
  try {
    const cookie = await createCookie(token);
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
  } catch (error) {
    res.sendStatus(403);
  }
});

router.delete("/revoke", async (req, res) => {
  const sessionCookie = req.cookies.session || "";
  res.clearCookie("session");
  try {
    const decodedClaims = await verifyCookie(sessionCookie);
    if (decodedClaims) {
      auth.revokeRefreshTokens(decodedClaims.sub);
    }
    res.sendStatus(204);
  } catch (error) {
    res.sendStatus(500);
  }
});

export default router;
