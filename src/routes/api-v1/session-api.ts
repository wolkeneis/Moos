import express, { Router } from "express";
import { v1 } from "moos-api";
import { createCookie, verifyCookie } from "../../auth";
import { env } from "../../environment";
import { auth } from "../../firebase";
import { csrfMiddleware } from "../../middleware";

const router: Router = express.Router();

router.use(csrfMiddleware);

router.post("/", async (req, res) => {
  const body: v1.operations["request-session"]["requestBody"]["content"]["application/json"] = req.body;
  const token = body.token;
  if (!token) {
    return res.sendStatus(400);
  }
  try {
    const cookie = await createCookie(token);
    return res
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
    console.error(error);
    return res.sendStatus(403);
  }
});

router.delete("/", async (req, res) => {
  const sessionCookie = req.cookies.session || "";
  res.clearCookie("session");
  try {
    const decodedClaims = await verifyCookie(sessionCookie);
    if (decodedClaims) {
      await auth.revokeRefreshTokens(decodedClaims.sub);
    }
    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

export default router;
