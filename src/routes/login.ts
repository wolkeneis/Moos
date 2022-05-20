import express from "express";
import passport from "passport";
import { createToken } from "../auth";
import { env, envRequire } from "../environment";
import { csrfMiddleware } from "../middleware";
import "../strategies";

const router = express.Router();

router.use(csrfMiddleware);

router.get("/", (req, res) => {
  res.redirect(env("CONTROL_ORIGIN") + "/redirect/login");
});

router.get("/discord", passport.authenticate("discord"));
router.get(
  "/discord/callback",
  passport.authenticate("discord", {
    failureRedirect: "/login",
    session: false
  }),
  async (req, res) => {
    if (!req.user) {
      return res.sendStatus(500);
    }
    try {
      const token = await createToken((req.user as { uid: string }).uid);
      return res.redirect(
        `${envRequire("CONTROL_ORIGIN")}/redirect/session?token=${encodeURIComponent(token)}&_csrf=${encodeURIComponent(req.csrfToken())}`
      );
    } catch (error) {
      console.error(error);
      return res.sendStatus(500);
    }
  }
);

router.get("/google", passport.authenticate("google"));
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: false
  }),
  async (req, res) => {
    if (!req.user) {
      return res.sendStatus(500);
    }
    try {
      const token = await createToken((req.user as { uid: string }).uid);
      return res.redirect(
        `${envRequire("CONTROL_ORIGIN")}/redirect/session?token=${encodeURIComponent(token)}&_csrf=${encodeURIComponent(req.csrfToken())}`
      );
    } catch (error) {
      console.error(error);
      return res.sendStatus(500);
    }
  }
);

export default router;
