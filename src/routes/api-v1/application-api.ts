import { User } from "database/database-adapter";
import express, { Router } from "express";
import { v1 } from "moos-api";
import passport from "passport";

const router: Router = express.Router();

router.use(passport.authenticate("bearer", { session: false }));

router.post("/profile", async (req, res) => {
  const profile = req.user as User;
  const response: v1.components["schemas"]["UserProfile"] = {
    uid: profile.uid,
    username: profile.username,
    avatar: profile.avatar,
    scopes: profile.scopes,
    private: profile.private,
    applications: profile.applications,
    creationDate: profile.creationDate
  };
  res.json(response);
});

export default router;
