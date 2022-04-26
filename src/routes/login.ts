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
    successReturnToOrRedirect: "/profile",
    failureRedirect: "/login"
  })
);

export default router;
