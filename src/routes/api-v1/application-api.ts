import express, { Router } from "express";
import type { moos_api_v1 as v1 } from "moos-api";
import passport from "passport";
import type { Profile } from "../../database/database-adapter.js";

const router: Router = express.Router();

router.use(passport.authenticate("bearer", { session: false }));

router.get("/profile", async (req, res) => {
  const profile = req.user as Profile;
  const response: v1.UserProfile = {
    uid: profile.uid,
    username: profile.username,
    avatar: profile.avatar,
    scopes: profile.scopes ?? [],
    private: profile.private,
    creationDate: profile.creationDate
  };
  return res.json(response);
});

export default router;
