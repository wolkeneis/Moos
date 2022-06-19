import express, { Router } from "express";
import type { v1 } from "moos-api";
import passport from "passport";
import type { User } from "../../database/database-adapter.js";

const router: Router = express.Router();

router.use(passport.authenticate("bearer", { session: false }));

router.get("/profile", async (req, res) => {
  const profile = req.user as User;
  const response: v1.UserProfile = {
    uid: profile.uid,
    username: profile.username,
    avatar: profile.avatar,
    scopes: profile.scopes,
    private: profile.private,
    applications: profile.applications,
    creationDate: profile.creationDate
  };
  return res.json(response);
});

export default router;
