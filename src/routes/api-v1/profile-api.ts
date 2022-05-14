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
        const providerProfile: v1.components["schemas"]["ProviderProfile"] = {
          provider: fetchedProfile.provider,
          providerId: fetchedProfile.providerId,
          username: fetchedProfile.username,
          avatar: fetchedProfile.avatar
        };
        providers.push(providerProfile);
      }
    }
  }
  const response: v1.components["schemas"]["UserProfile"] = {
    uid: profile.uid,
    username: profile.username,
    avatar: profile.avatar,
    scopes: profile.scopes,
    private: profile.private,
    providers: providers,
    clients: profile.clients,
    creationDate: profile.creationDate
  };
  res.json(response);
});

router.patch("/", async (req, res) => {
  const profile = req.user as User;
  const body: v1.operations["patch-profile"]["requestBody"]["content"]["application/json"] = req.body;
  try {
    await database.userPatch({
      uid: profile.uid,
      private: body.private
    });
    res.sendStatus(204);
  } catch (error) {
    res.sendStatus(500);
  }
});

export default router;
