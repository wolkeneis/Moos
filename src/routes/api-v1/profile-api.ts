import { AuthProvider, User } from "database/database-adapter";
import express, { Router } from "express";
import { v1 } from "moos-api";
import database from "../../database";
import { csrfMiddleware, ensureLoggedIn } from "../../middleware";
const router: Router = express.Router();

router.use(csrfMiddleware);
router.use(ensureLoggedIn());

router.post("/", async (req, res) => {
  const profile = req.user as User;
  const providers: v1.components["schemas"]["ProviderProfile"][] = [];
  if (profile.providers) {
    for (const provider of Object.keys(profile.providers)) {
      const providerId = profile.providers[provider as AuthProvider];
      if (providerId) {
        const fetchedProfile = await database.userProviderProfileFindById({
          provider: provider,
          providerId: providerId
        });
        providers.push({
          provider: fetchedProfile.provider,
          providerId: fetchedProfile.providerId,
          username: fetchedProfile.username,
          avatar: fetchedProfile.avatar
        } as v1.components["schemas"]["ProviderProfile"]);
      }
    }
  }
  res.json({
    uid: profile.uid,
    username: profile.username,
    avatar: profile.avatar,
    scopes: profile.scopes,
    private: profile.private,
    providers: providers,
    clients: profile.clients,
    creationDate: profile.creationDate
  } as v1.components["schemas"]["UserProfile"]);
});

router.patch("/", async (req, res) => {
  const profile = req.user as User;
  try {
    await database.userPatch({
      uid: profile.uid,
      private: req.body.private
    });
    res.sendStatus(204);
  } catch (error) {
    res.sendStatus(500);
  }
});

export default router;
