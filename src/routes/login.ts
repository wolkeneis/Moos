import express, { Router } from "express";
import passport from "passport";
import { createToken } from "../auth.js";
import { env, envRequire } from "../environment.js";
import { doubleCsrfUtilities } from "../middleware.js";
import "../strategies.js";

const router: Router = express.Router();

router.use(doubleCsrfUtilities.doubleCsrfProtection);

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
        `${envRequire("CONTROL_ORIGIN")}/redirect/session?token=${encodeURIComponent(token)}&_csrf=${encodeURIComponent(
          doubleCsrfUtilities.generateToken(res, req)
        )}`
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
        `${envRequire("CONTROL_ORIGIN")}/redirect/session?token=${encodeURIComponent(token)}&_csrf=${encodeURIComponent(
          doubleCsrfUtilities.generateToken(res, req)
        )}`
      );
    } catch (error) {
      console.error(error);
      return res.sendStatus(500);
    }
  }
);

export default router;
