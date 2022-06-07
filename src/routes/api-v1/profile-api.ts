import { AuthProvider, User } from "database/database-adapter";
import express, { Router } from "express";
import { v1 } from "moos-api";
import database from "../../database";
import { csrfMiddleware, ensureLoggedIn } from "../../middleware";
import "../../files";
import { signDownloadUrl, signUploadUrl, listFiles, FileEntry } from "../../files";
import { v4 as uuidv4 } from "uuid";

const router: Router = express.Router();

router.use(csrfMiddleware);
router.use(ensureLoggedIn());

router.post("/", async (req, res) => {
  const profile = req.user as User;
  const providers: v1.ProviderProfile[] = [];
  if (profile.providers) {
    for (const provider of Object.keys(profile.providers)) {
      const providerId = profile.providers[provider as AuthProvider];
      if (providerId) {
        const fetchedProfile = await database.userProviderProfileFindById({
          provider: provider,
          providerId: providerId
        });
        const providerProfile: v1.ProviderProfile = {
          provider: fetchedProfile.provider,
          providerId: fetchedProfile.providerId,
          username: fetchedProfile.username,
          avatar: fetchedProfile.avatar
        };
        providers.push(providerProfile);
      }
    }
  }
  const response: v1.UserProfile = {
    uid: profile.uid,
    username: profile.username,
    avatar: profile.avatar,
    scopes: profile.scopes,
    private: profile.private,
    providers: providers,
    applications: profile.applications,
    creationDate: profile.creationDate
  };
  return res.json(response);
});

router.patch("/", async (req, res) => {
  const profile = req.user as User;
  const body: v1.operations["patch-profile"]["requestBody"]["content"]["application/json"] = req.body;
  if (!body) {
    return res.sendStatus(400);
  }
  try {
    await database.userPatch({
      uid: profile.uid,
      private: body.private
    });
    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.post("/file", async (req, res) => {
  const profile = req.user as User;
  const body: v1.operations["get-profile-file"]["requestBody"]["content"]["application/json"] = req.body;
  if (!body || !body.id || (body.ttl && (typeof body.ttl !== "number" || body.ttl > 43200 || body.ttl < 60))) {
    return res.sendStatus(400);
  }
  try {
    const fileMetadata = await database.fileFind({ fileId: body.id });
    if (fileMetadata.private && fileMetadata.owner !== profile.uid) {
      return res.sendStatus(403);
    }
    const url = await signDownloadUrl({ uid: fileMetadata.owner, fileId: fileMetadata.id, filename: fileMetadata.name }, body.ttl ?? 14400);
    const file: v1.operations["get-profile-file"]["responses"]["200"]["content"]["application/json"] = {
      id: fileMetadata.id,
      url: url,
      ttl: body.ttl ?? 14400
    };
    return res.json(file);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.put("/file", async (req, res) => {
  const profile = req.user as User;
  const body: v1.operations["put-profile-file"]["requestBody"]["content"]["application/json"] = req.body;
  if (!body || !body.name) {
    return res.sendStatus(400);
  }
  try {
    const fileId = uuidv4();
    await database.fileCreate({ id: fileId, name: body.name, owner: profile.uid, private: body.private ?? true });
    const url = await signUploadUrl({ uid: profile.uid, fileId: fileId });
    const file: v1.operations["put-profile-file"]["responses"]["200"]["content"]["application/json"] = {
      id: fileId,
      url: url,
      ttl: 14400
    };
    return res.json(file);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.patch("/file", async (req, res) => {
  const profile = req.user as User;
  const body: v1.operations["patch-profile-file"]["requestBody"]["content"]["application/json"] = req.body;
  if (!body || !body.id) {
    return res.sendStatus(400);
  }
  try {
    const fileMetadata = await database.fileFind({ fileId: body.id });
    if (fileMetadata.owner !== profile.uid) {
      return res.sendStatus(403);
    }
    await database.filePatch({
      fileId: body.id,
      private: body.private,
      name: body.name
    });
    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.delete("/file", async (req, res) => {
  const profile = req.user as User;
  const body: v1.operations["delete-profile-file"]["requestBody"]["content"]["application/json"] = req.body;
  if (!body || !body.id) {
    return res.sendStatus(400);
  }
  try {
    const fileMetadata = await database.fileFind({ fileId: body.id });
    if (fileMetadata.owner !== profile.uid) {
      return res.sendStatus(403);
    }
    await database.fileDelete({
      fileId: body.id
    });
    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.post("/files", async (req, res) => {
  const profile = req.user as User;
  try {
    const metadata = await Promise.all((profile.files ?? []).map((fileId) => database.fileFind({ fileId: fileId })));
    const definitions = await listFiles({ uid: profile.uid });
    const files: v1.operations["get-profile-files"]["responses"]["200"]["content"]["application/json"] = await Promise.all(
      metadata.map(async (metadata) => {
        const definition: FileEntry = definitions.find((file) => file.key === `${profile.uid}/${metadata.id}`) ?? {};
        const file: v1.File = {
          id: metadata.id,
          name: metadata.name,
          owner: metadata.owner,
          private: metadata.private,
          lastModified: definition.lastModified ?? metadata.creationDate,
          size: definition.size ?? -1,
          creationDate: metadata.creationDate
        };
        return file;
      })
    );
    return res.json(files);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

export default router;
