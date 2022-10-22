import express, { Router } from "express";
import type { v1 } from "moos-api";
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
  const params: v1.operations["put-profile-friend"]["parameters"]["path"] = req.params;
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
  const params: v1.operations["delete-profile-friend"]["parameters"]["path"] = req.params;
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
  const params: v1.operations["post-profile-friend-applications"]["parameters"]["path"] = req.params;
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
  const params: v1.operations["post-profile-friend-files"]["parameters"]["path"] = req.params;
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

router.post("/friend/:friendId/collections", async (req, res) => {
  const profile = req.user as Profile;
  const params: v1.operations["post-profile-friend-collections"]["parameters"]["path"] = req.params;
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
    const collections: v1.operations["post-profile-friend-collections"]["responses"]["200"]["content"]["application/json"] = (
      await Promise.all(
        (
          await Promise.all(
            (friendProfile.collections ?? []).map(async (collectionId) => await database.collectionFind({ collectionId: collectionId }))
          )
        ).map(async (fetchedCollection) => {
          let thumbnail: File | undefined = undefined;
          if (fetchedCollection.thumbnail) {
            thumbnail = await database.fileFind({ fileId: fetchedCollection.thumbnail });
          }
          const collection: v1.CollectionPreview = {
            id: fetchedCollection.id,
            name: fetchedCollection.name,
            visibility: fetchedCollection.visibility,
            seasons: fetchedCollection.seasons ?? [],
            thumbnail:
              (thumbnail ? await signDownloadUrl({ uid: thumbnail.owner, fileId: thumbnail.id, filename: thumbnail.name }, 43200) : undefined) ??
              undefined,
            owner: fetchedCollection.owner,
            creationDate: fetchedCollection.creationDate
          };
          return collection;
        })
      )
    ).filter((collection) => collection.visibility === Visibility.public);
    return res.json(collections);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.post("/friend/:friendId/friends", async (req, res) => {
  const profile = req.user as Profile;
  const params: v1.operations["post-profile-friend-friends"]["parameters"]["path"] = req.params;
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
    const friends: v1.operations["post-profile-friend-friends"]["responses"]["200"]["content"]["application/json"] = (
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

router.post("/collections", async (req, res) => {
  const profile = req.user as Profile;
  try {
    const collections: v1.operations["post-profile-collections"]["responses"]["200"]["content"]["application/json"] = await Promise.all(
      (
        await Promise.all((profile.collections ?? []).map(async (collectionId) => await database.collectionFind({ collectionId: collectionId })))
      ).map(async (fetchedCollection) => {
        let thumbnail: File | undefined = undefined;
        if (fetchedCollection.thumbnail) {
          thumbnail = await database.fileFind({ fileId: fetchedCollection.thumbnail });
        }
        const collection: v1.CollectionPreview = {
          id: fetchedCollection.id,
          name: fetchedCollection.name,
          visibility: fetchedCollection.visibility,
          seasons: fetchedCollection.seasons ?? [],
          thumbnail:
            (thumbnail ? await signDownloadUrl({ uid: thumbnail.owner, fileId: thumbnail.id, filename: thumbnail.name }, 43200) : undefined) ??
            undefined,
          owner: fetchedCollection.owner,
          creationDate: fetchedCollection.creationDate
        };
        return collection;
      })
    );
    return res.json(collections);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.post("/collection", async (req, res) => {
  const profile = req.user as Profile;
  const body: v1.operations["post-profile-collection"]["requestBody"]["content"]["application/json"] = req.body;
  if (!body || !body.id) {
    return res.sendStatus(400);
  }
  try {
    const collection = await database.collectionFind({ collectionId: body.id });
    if (!collection) {
      return res.sendStatus(404);
    }
    if (collection.owner !== profile.uid && collection.visibility === Visibility.private) {
      return res.sendStatus(403);
    }
    let thumbnail: File | undefined = undefined;
    if (collection.thumbnail) {
      thumbnail = await database.fileFind({ fileId: collection.thumbnail });
    }
    const response: v1.operations["post-profile-collection"]["responses"]["200"]["content"]["application/json"] = {
      id: collection.id,
      name: collection.name,
      visibility: collection.visibility,
      seasons: await Promise.all(
        (
          await Promise.all((collection.seasons ?? []).map(async (seasonId) => await database.seasonFind({ seasonId: seasonId })))
        ).map(async (season) => ({
          ...season,
          episodes: await Promise.all(
            (
              await Promise.all(
                (season.episodes ?? []).map(async (episodeId) => await database.episodeFind({ episodeId: episodeId, seasonId: season.id }))
              )
            ).map(async (episode) => ({
              ...episode,
              sources: (
                await Promise.all((episode.sources ?? []).map(async (sourceId) => await database.sourceFind({ sourceId: sourceId })))
              ).map((source) => ({
                ...source,
                name: source.name ?? episode.name,
                url: source.url ?? undefined,
                key: source.key ?? undefined,
                language: source.language ?? undefined,
                subtitles: source.subtitles ?? undefined
              }))
            }))
          )
        }))
      ),
      owner: collection.owner,
      creationDate: collection.creationDate
    };
    return res.json(response);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.put("/collection", async (req, res) => {
  const profile = req.user as Profile;
  const body: v1.operations["put-profile-collection"]["requestBody"]["content"]["application/json"] = req.body;
  if (!body || !body.name) {
    return res.sendStatus(400);
  }
  try {
    const collectionId = uuidv4();
    let thumbnail: File | undefined = undefined;
    if (body.thumbnail) {
      thumbnail = await database.fileFind({ fileId: body.thumbnail });
      if (!thumbnail) {
        return res.sendStatus(404);
      }
      if (thumbnail.owner !== profile.uid) {
        return res.sendStatus(403);
      }
    }
    const collection = await database.collectionCreate({
      id: collectionId,
      name: body.name,
      visibility: body.visibility ?? Visibility.private,
      thumbnail: thumbnail?.id,
      owner: profile.uid
    });
    const response: v1.operations["put-profile-collection"]["responses"]["200"]["content"]["application/json"] = {
      id: collection.id,
      name: collection.name,
      visibility: collection.visibility,
      seasons: await Promise.all(
        (
          await Promise.all((collection.seasons ?? []).map(async (seasonId) => await database.seasonFind({ seasonId: seasonId })))
        ).map(async (season) => ({
          ...season,
          episodes: await Promise.all(
            (
              await Promise.all(
                (season.episodes ?? []).map(async (episodeId) => await database.episodeFind({ episodeId: episodeId, seasonId: season.id }))
              )
            ).map(async (episode) => ({
              ...episode,
              sources: (
                await Promise.all((episode.sources ?? []).map(async (sourceId) => await database.sourceFind({ sourceId: sourceId })))
              ).map((source) => ({
                ...source,
                name: source.name ?? episode.name,
                url: source.url ?? undefined,
                key: source.key ?? undefined,
                language: source.language ?? undefined,
                subtitles: source.subtitles ?? undefined
              }))
            }))
          )
        }))
      ),
      owner: collection.owner,
      creationDate: collection.creationDate
    };
    return res.json(response);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.patch("/collection", async (req, res) => {
  const profile = req.user as Profile;
  const body: v1.operations["patch-profile-collection"]["requestBody"]["content"]["application/json"] = req.body;
  if (!body || !body.id || !(body.name || body.visibility || body.thumbnail)) {
    return res.sendStatus(400);
  }
  try {
    const collection = await database.collectionFind({ collectionId: body.id });
    if (!collection) {
      return res.sendStatus(404);
    }
    if (collection.owner !== profile.uid) {
      return res.sendStatus(403);
    }
    let thumbnail: File | undefined = undefined;
    if (body.thumbnail) {
      thumbnail = await database.fileFind({ fileId: body.thumbnail });
      if (!thumbnail) {
        return res.sendStatus(404);
      }
      if (thumbnail.owner !== profile.uid) {
        return res.sendStatus(403);
      }
    }
    await database.collectionPatch({
      collectionId: body.id,
      name: body.name,
      visibility: body.visibility,
      thumbnail: thumbnail?.id
    });
    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.delete("/collection", async (req, res) => {
  const profile = req.user as Profile;
  const body: v1.operations["delete-profile-collection"]["requestBody"]["content"]["application/json"] = req.body;
  if (!body || !body.id) {
    return res.sendStatus(400);
  }
  try {
    const collection = await database.collectionFind({ collectionId: body.id });
    if (!collection) {
      return res.sendStatus(404);
    }
    if (collection.owner !== profile.uid) {
      return res.sendStatus(403);
    }
    await database.collectionDelete({
      collectionId: body.id
    });
    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.post("/season", async (req, res) => {
  const profile = req.user as Profile;
  const body: v1.operations["post-profile-season"]["requestBody"]["content"]["application/json"] = req.body;
  if (!body || !body.id) {
    return res.sendStatus(400);
  }
  try {
    const season = await database.seasonFind({ seasonId: body.id });
    if (!season) {
      return res.sendStatus(404);
    }
    const collection = await database.collectionFind({ collectionId: season.collectionId });
    if (collection.owner !== profile.uid && collection.visibility === Visibility.private) {
      return res.sendStatus(403);
    }
    const response: v1.operations["post-profile-season"]["responses"]["200"]["content"]["application/json"] = {
      collectionId: season.collectionId,
      id: season.id,
      index: season.index,
      episodes: await Promise.all(
        (
          await Promise.all(
            (season.episodes ?? []).map(async (episodeId) => await database.episodeFind({ episodeId: episodeId, seasonId: season.id }))
          )
        ).map(async (episode) => ({
          ...episode,
          sources: (
            await Promise.all((episode.sources ?? []).map(async (sourceId) => await database.sourceFind({ sourceId: sourceId })))
          ).map((source) => ({
            ...source,
            name: source.name ?? episode.name,
            url: source.url ?? undefined,
            key: source.key ?? undefined,
            language: source.language ?? undefined,
            subtitles: source.subtitles ?? undefined
          }))
        }))
      ),
      languages: season.languages ?? [],
      subtitles: season.subtitles ?? []
    };
    return res.json(response);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.put("/season", async (req, res) => {
  const profile = req.user as Profile;
  const body: v1.operations["put-profile-season"]["requestBody"]["content"]["application/json"] = req.body;
  if (!body || !body.collectionId || body.index === undefined) {
    return res.sendStatus(400);
  }
  try {
    const collection = await database.collectionFind({ collectionId: body.collectionId });
    if (!collection) {
      return res.sendStatus(404);
    }
    if (collection.owner !== profile.uid) {
      return res.sendStatus(403);
    }
    const seasonId = uuidv4();
    const season = await database.seasonCreate({
      collectionId: collection.id,
      id: seasonId,
      index: body.index
    });
    const response: v1.operations["put-profile-season"]["responses"]["200"]["content"]["application/json"] = {
      collectionId: season.collectionId,
      id: season.id,
      index: season.index,
      episodes: [],
      languages: [],
      subtitles: []
    };
    return res.json(response);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.patch("/season", async (req, res) => {
  const profile = req.user as Profile;
  const body: v1.operations["patch-profile-season"]["requestBody"]["content"]["application/json"] = req.body;
  if (!body || !body.id || body.index === undefined) {
    return res.sendStatus(400);
  }
  try {
    const season = await database.seasonFind({ seasonId: body.id });
    if (!season) {
      return res.sendStatus(404);
    }
    const collection = await database.collectionFind({ collectionId: season.collectionId });
    if (collection.owner !== profile.uid) {
      return res.sendStatus(403);
    }
    await database.seasonPatch({
      seasonId: body.id,
      index: body.index
    });
    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.delete("/season", async (req, res) => {
  const profile = req.user as Profile;
  const body: v1.operations["delete-profile-season"]["requestBody"]["content"]["application/json"] = req.body;
  if (!body || !body.id) {
    return res.sendStatus(400);
  }
  try {
    const season = await database.seasonFind({ seasonId: body.id });
    if (!season) {
      return res.sendStatus(404);
    }
    const collection = await database.collectionFind({ collectionId: season.collectionId });
    if (collection.owner !== profile.uid) {
      return res.sendStatus(403);
    }
    await database.seasonDelete({
      seasonId: body.id
    });
    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.post("/episode", async (req, res) => {
  const profile = req.user as Profile;
  const body: v1.operations["post-profile-episode"]["requestBody"]["content"]["application/json"] = req.body;
  if (!body || !body.id || !body.seasonId) {
    return res.sendStatus(400);
  }
  try {
    const episode = await database.episodeFind({ seasonId: body.seasonId, episodeId: body.id });
    if (!episode) {
      return res.sendStatus(404);
    }
    const season = await database.seasonFind({ seasonId: body.seasonId });
    const collection = await database.collectionFind({ collectionId: season.collectionId });
    if (collection.owner !== profile.uid && collection.visibility === Visibility.private) {
      return res.sendStatus(403);
    }
    const sources = await Promise.all(
      (episode.sources ?? []).map(async (sourceId) => {
        const source = await database.sourceFind({ sourceId });
        return {
          ...source,
          name: source.name ?? episode.name,
          url: source.url ?? undefined,
          key: source.key ?? undefined,
          subtitles: source.subtitles ?? undefined
        };
      })
    );
    const response: v1.operations["post-profile-episode"]["responses"]["200"]["content"]["application/json"] = {
      seasonId: season.id,
      id: episode.id,
      index: episode.index,
      name: episode.name,
      sources: sources ?? [],
      creationDate: episode.creationDate
    };
    return res.json(response);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.put("/episode", async (req, res) => {
  const profile = req.user as Profile;
  const body: v1.operations["put-profile-episode"]["requestBody"]["content"]["application/json"] = req.body;
  if (!body || !body.seasonId || body.index === undefined || !body.name) {
    return res.sendStatus(400);
  }
  try {
    const season = await database.seasonFind({ seasonId: body.seasonId });
    const collection = await database.collectionFind({ collectionId: season.collectionId });
    if (collection.owner !== profile.uid) {
      return res.sendStatus(403);
    }
    const episodeId = uuidv4();
    const episode = await database.episodeCreate({
      seasonId: season.id,
      id: episodeId,
      index: body.index,
      name: body.name
    });
    const response: v1.operations["put-profile-episode"]["responses"]["200"]["content"]["application/json"] = {
      seasonId: season.id,
      id: episode.id,
      index: episode.index,
      name: episode.name,
      sources: [],
      creationDate: episode.creationDate
    };
    return res.json(response);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.patch("/episode", async (req, res) => {
  const profile = req.user as Profile;
  const body: v1.operations["patch-profile-episode"]["requestBody"]["content"]["application/json"] = req.body;
  if (!body || !body.id || !body.seasonId || !(body.index !== undefined || body.name)) {
    return res.sendStatus(400);
  }
  try {
    const season = await database.seasonFind({ seasonId: body.seasonId });
    const collection = await database.collectionFind({ collectionId: season.collectionId });
    if (collection.owner !== profile.uid) {
      return res.sendStatus(403);
    }
    await database.episodePatch({
      seasonId: body.seasonId,
      episodeId: body.id,
      index: body.index,
      name: body.name
    });
    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.delete("/episode", async (req, res) => {
  const profile = req.user as Profile;
  const body: v1.operations["delete-profile-episode"]["requestBody"]["content"]["application/json"] = req.body;
  if (!body || !body.id || !body.seasonId) {
    return res.sendStatus(400);
  }
  try {
    const season = await database.seasonFind({ seasonId: body.seasonId });
    const collection = await database.collectionFind({ collectionId: season.collectionId });
    if (collection.owner !== profile.uid) {
      return res.sendStatus(403);
    }
    await database.episodeDelete({
      seasonId: body.seasonId,
      episodeId: body.id
    });
    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.post("/source", async (req, res) => {
  const profile = req.user as Profile;
  const body: v1.operations["post-profile-source"]["requestBody"]["content"]["application/json"] = req.body;
  if (!body || !body.id) {
    return res.sendStatus(400);
  }
  try {
    const source = await database.sourceFind({ sourceId: body.id });
    if (!source) {
      return res.sendStatus(404);
    }
    const season = await database.seasonFind({ seasonId: source.seasonId });
    const collection = await database.collectionFind({ collectionId: season.collectionId });
    if (collection.owner !== profile.uid && collection.visibility === Visibility.private) {
      return res.sendStatus(403);
    }
    if (!source.key && !source.url) {
      return res.sendStatus(500);
    }
    const url = source.url ?? (await signDownloadUrl({ uid: collection.owner, fileId: source.key as string, filename: source.id }, 43200));
    const response: v1.operations["post-profile-source"]["responses"]["200"]["content"]["application/json"] = {
      url: url
    };
    return res.json(response);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.put("/source", async (req, res) => {
  const profile = req.user as Profile;
  const body: v1.operations["put-profile-source"]["requestBody"]["content"]["application/json"] = req.body;
  if (!body || !body.seasonId || !body.episodeId || !body.language || !(body.key || body.url)) {
    return res.sendStatus(400);
  }
  try {
    const season = await database.seasonFind({ seasonId: body.seasonId });
    const collection = await database.collectionFind({ collectionId: season.collectionId });
    if (collection.owner !== profile.uid) {
      return res.sendStatus(403);
    }
    if (!(body.language in Language) || (body.subtitles && !(body.subtitles in Language))) {
      return res.sendStatus(400);
    }
    if (body.key) {
      const fileMetadata = await database.fileFind({ fileId: body.key });
      if (!fileMetadata) {
        return res.sendStatus(404);
      }
      if (fileMetadata.owner !== profile.uid) {
        return res.sendStatus(403);
      }
    } else if (body.url) {
      const url = new URL(body.url);
      if (url.hostname !== "youtube.com" && url.hostname !== "youtu.be" && url.hostname !== "www.youtube.com" && url.hostname !== "www.youtu.be") {
        return res.sendStatus(403);
      }
    }
    const sourceId = uuidv4();
    const source = await database.sourceCreate({
      seasonId: body.seasonId,
      episodeId: body.episodeId,
      id: sourceId,
      language: body.language as Language,
      name: body.name,
      url: body.url,
      key: body.key,
      subtitles: body.subtitles as Language
    });
    const response: v1.operations["put-profile-source"]["responses"]["200"]["content"]["application/json"] = {
      seasonId: season.id,
      episodeId: source.episodeId,
      id: source.id,
      language: source.language,
      name: source.name ?? undefined,
      url: source.url ?? undefined,
      key: source.key ?? undefined,
      subtitles: source.subtitles ?? undefined,
      creationDate: source.creationDate
    };
    return res.json(response);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.patch("/source", async (req, res) => {
  const profile = req.user as Profile;
  const body: v1.operations["patch-profile-source"]["requestBody"]["content"]["application/json"] = req.body;
  if (
    !body ||
    !body.id ||
    !body.episodeId ||
    !body.seasonId ||
    !(body.language || body.name || body.url || body.key || body.subtitles) ||
    (body.url && body.key)
  ) {
    return res.sendStatus(400);
  }
  try {
    const season = await database.seasonFind({ seasonId: body.seasonId });
    const collection = await database.collectionFind({ collectionId: season.collectionId });
    if (collection.owner !== profile.uid) {
      return res.sendStatus(403);
    }
    if (body.language && !(body.language in Language)) {
      return res.sendStatus(400);
    }
    if (body.subtitles && !(body.subtitles in Language)) {
      return res.sendStatus(400);
    }
    if (body.key) {
      const fileMetadata = await database.fileFind({ fileId: body.key });
      if (!fileMetadata) {
        return res.sendStatus(404);
      }
      if (fileMetadata.owner !== profile.uid) {
        return res.sendStatus(403);
      }
    }
    if (body.url) {
      const url = new URL(body.url);
      if (url.hostname !== "youtube.com" && url.hostname !== "youtu.be" && url.hostname !== "www.youtube.com" && url.hostname !== "www.youtu.be") {
        return res.sendStatus(403);
      }
    }
    await database.sourcePatch({
      seasonId: body.seasonId,
      episodeId: body.episodeId,
      sourceId: body.id,
      language: body.language as Language,
      name: body.name,
      url: body.url,
      key: body.key,
      subtitles: body.subtitles as Language
    });
    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

router.delete("/source", async (req, res) => {
  const profile = req.user as Profile;
  const body: v1.operations["delete-profile-source"]["requestBody"]["content"]["application/json"] = req.body;
  if (!body || !body.id || !body.seasonId || !body.episodeId) {
    return res.sendStatus(400);
  }
  try {
    const season = await database.seasonFind({ seasonId: body.seasonId });
    const collection = await database.collectionFind({ collectionId: season.collectionId });
    if (collection.owner !== profile.uid) {
      return res.sendStatus(403);
    }
    await database.sourceDelete({
      seasonId: body.seasonId,
      episodeId: body.episodeId,
      sourceId: body.id
    });
    return res.sendStatus(204);
  } catch (error) {
    console.error(error);
    return res.sendStatus(500);
  }
});

export default router;
