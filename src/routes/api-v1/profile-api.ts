import express, { Router } from "express";
import type { moos_api_v1 as v1 } from "moos-api";
import { v4 as uuidv4 } from "uuid";
import { AuthProvider, File, Language, Visibility, type Profile } from "../../database/database-adapter.js";
import database from "../../database/index.js";
import { deleteFile, FileEntry, listFiles, signDownloadUrl, signUploadUrl } from "../../files.js";
import { doubleCsrfUtilities, ensureLoggedIn } from "../../middleware.js";

const router: Router = express.Router();

router.use(doubleCsrfUtilities.doubleCsrfProtection);
router.use(ensureLoggedIn());

router.post("/", async (req, res) => {
  const profile = req.user as Profile;
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
  const response: v1.operations["fetch-profile"]["responses"]["200"]["content"]["application/json"] = {
    uid: profile.uid,
    username: profile.username,
    avatar: profile.avatar,
    scopes: profile.scopes ?? [],
    private: profile.private,
    providers: providers,
    creationDate: profile.creationDate
  };
  return res.json(response);
});

router.patch("/", async (req, res) => {
  const profile = req.user as Profile;
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

router.post("/friends", async (req, res) => {
  const profile = req.user as Profile;
  try {
    const friends: v1.operations["post-profile-friends"]["responses"]["200"]["content"]["application/json"] = (
      await Promise.all(profile.friends?.map(async (friendId) => await database.userFindById({ uid: friendId })) ?? [])
    ).map((fetchedFriend) => {
      const friend: v1.Friend = {
        uid: fetchedFriend.uid,
        username: fetchedFriend.username,
        avatar: fetchedFriend.avatar,
        scopes: fetchedFriend.scopes,
        private: fetchedFriend.private,
        consensual: fetchedFriend.friends?.includes(profile.uid) ?? false,
        creationDate: fetchedFriend.creationDate
      };
      return friend;
    });
    return res.json(friends);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.put("/friend/:friendId", async (req, res) => {
  const profile = req.user as Profile;
  const params: v1.paths["/profile/friend/{friendId}"]["parameters"]["path"] = req.params;
  if (!params || !params.friendId || params.friendId === profile.uid) {
    return res.sendStatus(400);
  }
  try {
    const friendProfile = await database.userFindById({ uid: params.friendId });
    if (!friendProfile) {
      return res.sendStatus(404);
    }
    if (profile.friends?.includes(friendProfile.uid)) {
      return res.sendStatus(400);
    }
    await database.friendAdd({ uid: profile.uid, friendId: friendProfile.uid });
    return res.sendStatus(201);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.delete("/friend/:friendId", async (req, res) => {
  const profile = req.user as Profile;
  const params: v1.paths["/profile/friend/{friendId}"]["parameters"]["path"] = req.params;
  if (!params || !params.friendId) {
    return res.sendStatus(400);
  }
  try {
    const friendId = params.friendId;
    if (!profile.friends?.includes(friendId)) {
      return res.sendStatus(404);
    }
    await database.friendRemove({ uid: profile.uid, friendId: friendId });
    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.post("/friend/:friendId/applications", async (req, res) => {
  const profile = req.user as Profile;
  const params: v1.paths["/profile/friend/{friendId}/applications"]["parameters"]["path"] = req.params;
  if (!params || !params.friendId) {
    return res.sendStatus(400);
  }
  try {
    const friendId = params.friendId;
    if (!profile.friends?.includes(friendId)) {
      return res.sendStatus(404);
    }
    const friendProfile = await database.userFindById({ uid: friendId });
    if (friendProfile.private) {
      if (!friendProfile.friends?.includes(profile.uid)) {
        return res.json([]);
      }
    }
    const applications: v1.operations["post-profile-friend-applications"]["responses"]["200"]["content"]["application/json"] = await Promise.all(
      (friendProfile.applications ?? []).map(async (applicationId) => await database.applicationFindById({ applicationId: applicationId }))
    );
    return res.json(applications);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.post("/friend/:friendId/files", async (req, res) => {
  const profile = req.user as Profile;
  const params: v1.paths["/profile/friend/{friendId}/files"]["parameters"]["path"] = req.params;
  if (!params || !params.friendId) {
    return res.sendStatus(400);
  }
  try {
    const friendId = params.friendId;
    if (!profile.friends?.includes(friendId)) {
      return res.sendStatus(404);
    }
    const friendProfile = await database.userFindById({ uid: friendId });
    if (friendProfile.private) {
      if (!friendProfile.friends?.includes(profile.uid)) {
        return res.json([]);
      }
    }
    const metadata: File[] = (
      await Promise.all(friendProfile.files?.map(async (fileId) => await database.fileFind({ fileId: fileId })) ?? [])
    ).filter((file) => !file.private);
    const definitions = await listFiles({ uid: friendId });
    const files: v1.operations["post-profile-friend-files"]["responses"]["200"]["content"]["application/json"] = await Promise.all(
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

router.post("/friend/:friendId/friends", async (req, res) => {
  const profile = req.user as Profile;
  const params: v1.paths["/profile/friend/{friendId}/friends"]["parameters"]["path"] = req.params;
  if (!params || !params.friendId) {
    return res.sendStatus(400);
  }
  try {
    const friendId = params.friendId;
    if (!profile.friends?.includes(friendId)) {
      return res.sendStatus(404);
    }
    const friendProfile = await database.userFindById({ uid: friendId });
    if (friendProfile.private) {
      return res.sendStatus(403);
    }
    const friends: v1.paths["/profile/friend/{friendId}/friends"]["post"]["responses"]["200"]["content"]["application/json"] = (
      await Promise.all(friendProfile.friends?.map(async (friendId) => await database.userFindById({ uid: friendId })) ?? [])
    ).map((fetchedFriend) => {
      const friend: v1.Friend = {
        uid: fetchedFriend.uid,
        username: fetchedFriend.username,
        avatar: fetchedFriend.avatar,
        scopes: fetchedFriend.scopes,
        private: fetchedFriend.private,
        consensual: fetchedFriend.friends?.includes(friendProfile.uid) ?? false,
        creationDate: fetchedFriend.creationDate
      };
      return friend;
    });
    return res.json(friends);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.post("/files", async (req, res) => {
  const profile = req.user as Profile;
  try {
    const metadata = await Promise.all((profile.files ?? []).map((fileId) => database.fileFind({ fileId: fileId })));
    const definitions = await listFiles({ uid: profile.uid });
    const files: v1.operations["post-profile-files"]["responses"]["200"]["content"]["application/json"] = await Promise.all(
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

router.post("/file", async (req, res) => {
  const profile = req.user as Profile;
  const body: v1.operations["post-profile-file"]["requestBody"]["content"]["application/json"] = req.body;
  if (!body || !body.id || (body.ttl && (typeof body.ttl !== "number" || body.ttl > 43200 || body.ttl < 60))) {
    return res.sendStatus(400);
  }
  try {
    const fileMetadata = await database.fileFind({ fileId: body.id });
    if (!fileMetadata) {
      return res.sendStatus(404);
    }
    if (fileMetadata.private && fileMetadata.owner !== profile.uid) {
      return res.sendStatus(403);
    }
    const url = await signDownloadUrl({ uid: fileMetadata.owner, fileId: fileMetadata.id, filename: fileMetadata.name }, body.ttl ?? 14400);
    const file: v1.operations["post-profile-file"]["responses"]["200"]["content"]["application/json"] = {
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
  const profile = req.user as Profile;
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
  const profile = req.user as Profile;
  const body: v1.operations["patch-profile-file"]["requestBody"]["content"]["application/json"] = req.body;
  if (!body || !body.id) {
    return res.sendStatus(400);
  }
  try {
    const fileMetadata = await database.fileFind({ fileId: body.id });
    if (!fileMetadata) {
      return res.sendStatus(404);
    }
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
  const profile = req.user as Profile;
  const body: v1.operations["delete-profile-file"]["requestBody"]["content"]["application/json"] = req.body;
  if (!body || !body.id) {
    return res.sendStatus(400);
  }
  try {
    const fileMetadata = await database.fileFind({ fileId: body.id });
    if (!fileMetadata) {
      return res.sendStatus(404);
    }
    if (fileMetadata.owner !== profile.uid) {
      return res.sendStatus(403);
    }
    await database.fileDelete({
      fileId: body.id
    });
    await deleteFile({ uid: fileMetadata.owner, fileId: fileMetadata.id });
    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

export default router;
