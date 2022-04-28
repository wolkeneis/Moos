import { createToken } from "../auth";
import { envRequire } from "../environment";
import express from "express";
import passport from "passport";
import { csrfMiddleware } from "../session";

import "../strategies";

const router = express.Router();

router.use(csrfMiddleware);

router.get("/", (req, res) => {
  res.redirect(process.env.CONTROL_ORIGIN + "/redirect/profile");
});

router.get("/discord", passport.authenticate("discord"));
router.get(
  "/discord/callback",
  passport.authenticate("discord", {
    failureRedirect: "/login"
  }),
  (req, res) => {
    console.log(req.user);
    if (!req.user) {
      return res.sendStatus(500);
    }
    createToken((req.user as { uid: string }).uid).then((token) => {
      res.redirect(
        envRequire("CONTROL_ORIGIN") +
          `/redirect/session?token=${encodeURIComponent(token)}&_csrf=${encodeURIComponent(req.csrfToken())}`
      );
    }).catch(() => res.sendStatus(500));
  }
);

export default router;
