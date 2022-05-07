import express, { Router } from "express";
import database from "../../database";
import { csrfMiddleware, ensureLoggedIn } from "../../middleware";

const router: Router = express.Router();

router.use(csrfMiddleware);
router.use(ensureLoggedIn("/login"));

router.post("/self", async (req, res) => {
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
