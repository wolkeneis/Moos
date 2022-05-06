import express, { Router } from "express";
import database from "../database";
import { csrfMiddleware, ensureLoggedIn } from "../middleware";

const router: Router = express.Router();

const profileRouter: Router = express.Router();

router.use("/profile", profileRouter);

profileRouter.use(csrfMiddleware);
profileRouter.use(ensureLoggedIn("/login"));

profileRouter.post("/", async (req, res) => {
  const profile = await database.userFindById({ uid: req.token!.uid });
  if (profile) {
    res.json({
      uid: profile.uid,
      username: profile.username,
      avatar: profile.avatar,
      scopes: profile.scopes,
      private: profile.private,
      creationDate: profile.creationDate
    });
  } else {
    res.sendStatus(500);
  }
});

export default router;
