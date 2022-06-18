import argon2 from "argon2";
import crypto from "crypto";
import { Reference } from "firebase-admin/database";
import { Database } from "firebase-admin/lib/database/database";
import DatabaseAdapter, {
  Application,
  ApplicationToken,
  AuthorizationCode,
  CheckApplicationSecretOptions,
  Collection,
  CreateApplicationOptions,
  CreateCollectionOptions,
  CreateEpisodeOptions,
  CreateFileOptions,
  CreateSeasonOptions,
  CreateSourceOptions,
  CreateUserOptions,
  DeleteCollectionOptions,
  DeleteEpisodeOptions,
  DeleteFileOptions,
  DeleteSeasonOptions,
  DeleteSourceOptions,
  Episode,
  File,
  FindAccessTokenByIdOptions,
  FindAccessTokenOptions,
  FindApplicationByIdOptions,
  FindAuthorizationCodeOptions,
  FindCollectionByIdOptions,
  FindEpisodeByIdOptions,
  FindFileByIdOptions,
  FindProviderProfileByIdOptions,
  FindRefreshTokenByIdOptions,
  FindRefreshTokenOptions,
  FindSeasonByIdOptions,
  FindSourceByIdOptions,
  FindUserByIdOptions,
  PatchCollectionOptiopns,
  PatchEpisodeOptiopns,
  PatchFileOptiopns,
  PatchSeasonOptiopns,
  PatchSourceOptiopns,
  PatchUserOptiopns,
  ProviderProfile,
  ProviderReferences,
  RegenerateApplicationSecretOptions,
  RemoveAccessTokenByIdsOptions,
  RemoveAuthorizationCodeOptions,
  RemoveRefreshTokenByIdsOptions,
  SaveAccessTokenOptions,
  SaveAuthorizationCodeOptions,
  SaveRefreshTokenOptions,
  Season,
  Source,
  TokenReference,
  UpdateApplicationNameOptions,
  UpdateApplicationRedirectUriOptions,
  UpdateOrCreateProviderProfileOptions,
  User
} from "./database-adapter";

function _randomToken(length: number): string {
  return crypto.randomBytes(length).toString("hex");
}

export default class RealtimeDatabaseImpl implements DatabaseAdapter {
  database: Database;
  applications: Reference;
  profiles: Reference;
  providers: Reference;
  files: Reference;
  authorizationCodes: Reference;
  accessTokens: Reference;
  refreshTokens: Reference;
  tokens: Reference;
  collections: Reference;
  seasons: Reference;
  episodes: Reference;
  sources: Reference;

  constructor(database: Database) {
    this.database = database;
    this.applications = database.ref("applications");
    this.profiles = database.ref("profiles");
    this.providers = database.ref("providers");
    this.files = database.ref("files");
    this.authorizationCodes = database.ref("tokens/authorizationCodes");
    this.accessTokens = database.ref("tokens/accessTokens");
    this.refreshTokens = database.ref("tokens/refreshTokens");
    this.tokens = database.ref("tokens");
    this.collections = database.ref("eiswald/collections");
    this.seasons = database.ref("eiswald/seasons");
    this.episodes = database.ref("eiswald/episodes");
    this.sources = database.ref("eiswald/sources");
  }

  async applicationFindById(options: FindApplicationByIdOptions): Promise<Application> {
    return (await this.applications.child(options.applicationId).get()).val();
  }
  async applicationCreate(options: CreateApplicationOptions): Promise<string> {
    const token = _randomToken(256);
    const secret: string = await argon2.hash(token, {
      type: argon2.argon2id,
      timeCost: 2, //Iterations
      memoryCost: 16384, //Memory Size
      parallelism: 1 //Threads
    });
    const application: Application = {
      ...options,
      secret: secret,
      trusted: false,
      creationDate: Date.now()
    };
    await this.applications.child(application.id).set(application);
    await this.profiles.child(application.owner).child("applications").push(application.id);
    return token;
  }
  async applicationUpdateName(options: UpdateApplicationNameOptions): Promise<void> {
    await this.applications.child(options.applicationId).child("name").update(options.name);
  }
  async applicationUpdateRedirectUri(options: UpdateApplicationRedirectUriOptions): Promise<void> {
    await this.applications.child(options.applicationId).child("redirectUri").update(options.redirectUri);
  }
  async applicationRegenerateSecret(options: RegenerateApplicationSecretOptions): Promise<string> {
    const token = _randomToken(256);
    const secret: string = await argon2.hash(token, {
      type: argon2.argon2id,
      timeCost: 2, //Iterations
      memoryCost: 16384, //Memory Size
      parallelism: 1 //Threads
    });
    await this.applications.child(options.applicationId).child("secret").update(secret);
    return token;
  }
  async applicationCheckSecret(options: CheckApplicationSecretOptions): Promise<boolean> {
    const secret = (await this.applications.child(options.applicationId).child("secret").get()).val();
    return await argon2.verify(secret, options.secret);
  }

  async userFindById(options: FindUserByIdOptions): Promise<User> {
    return (await this.profiles.child(options.uid).get()).val();
  }
  async userCreate(options: CreateUserOptions): Promise<void> {
    const user: User = {
      ...options,
      applications: [],
      files: [],
      collections: [],
      creationDate: Date.now()
    };
    await this.profiles.child(user.uid).set(user);
  }
  async userPatch(options: PatchUserOptiopns): Promise<void> {
    if (options.private !== undefined) {
      await this.profiles.child(options.uid).child("private").set(options.private);
    }
  }
  async userProviderProfileUpdateOrCreate(options: UpdateOrCreateProviderProfileOptions): Promise<ProviderProfile> {
    const providerProfile: ProviderProfile = {
      ...options
    };
    await this.providers.child(options.provider).child(providerProfile.providerId).update(providerProfile);
    const providerReferences: ProviderReferences = {};
    providerReferences[options.provider] = providerProfile.providerId;
    await this.profiles.child(providerProfile.uid).child("providers").update(providerReferences);
    return providerProfile;
  }
  async userProviderProfileFindById(options: FindProviderProfileByIdOptions): Promise<ProviderProfile> {
    return (await this.providers.child(options.provider).child(options.providerId).get()).val();
  }

  async fileFind(options: FindFileByIdOptions): Promise<File> {
    return (await this.files.child(options.fileId).get()).val();
  }
  async fileCreate(options: CreateFileOptions): Promise<void> {
    const file: File = {
      ...options,
      private: options.private ?? true,
      creationDate: Date.now()
    };
    await this.files.child(options.id).set(file);
    const files = ((await this.userFindById({ uid: options.owner })).files ?? []).concat(file.id);
    await this.profiles.child(options.owner).child("files").set(files);
  }
  async filePatch(options: PatchFileOptiopns): Promise<void> {
    if (options.name !== undefined) {
      await this.files.child(options.fileId).child("name").set(options.name);
    }
    if (options.private !== undefined) {
      await this.files.child(options.fileId).child("private").set(options.private);
    }
  }
  async fileDelete(options: DeleteFileOptions): Promise<void> {
    const file = await this.fileFind({ fileId: options.fileId });
    await this.files.child(file.id).remove();
    const profile = await this.userFindById({ uid: file.owner });
    profile.files = (profile.files ?? []).filter((fileId) => fileId !== file.id);
    await this.profiles.child(file.owner).child("files").set(profile.files);
  }

  async collectionFind(options: FindCollectionByIdOptions): Promise<Collection> {
    return (await this.collections.child(options.collectionId).get()).val();
  }
  async collectionCreate(options: CreateCollectionOptions): Promise<Collection> {
    const collection: Collection = {
      ...options,
      thumbnail: options.thumbnail ?? null,
      seasons: [],
      creationDate: Date.now()
    };
    await this.collections.child(collection.id).set(collection);
    const collections = ((await this.userFindById({ uid: options.owner })).collections ?? []).concat(collection.id);
    await this.profiles.child(options.owner).child("collections").set(collections);
    return collection;
  }
  async collectionPatch(options: PatchCollectionOptiopns): Promise<void> {
    if (options.name !== undefined) {
      await this.collections.child(options.collectionId).child("name").set(options.name);
    }
    if (options.visibility !== undefined) {
      await this.collections.child(options.collectionId).child("visibility").set(options.visibility);
    }
    if (options.thumbnail !== undefined) {
      await this.collections.child(options.collectionId).child("thumbnail").set(options.thumbnail);
    }
  }
  async collectionDelete(options: DeleteCollectionOptions): Promise<void> {
    const collection = await this.collectionFind({ collectionId: options.collectionId });
    await this.collections.child(collection.id).remove();
    const profile = await this.userFindById({ uid: collection.owner });
    profile.collections = (profile.collections ?? []).filter((collectionId) => collectionId !== collection.id);
    await this.profiles.child(collection.owner).child("collections").set(profile.collections);
    if (collection.seasons && collection.seasons.length !== 0) {
      collection.seasons.forEach(async (seasonId) => {
        await this.seasonDelete({ seasonId: seasonId });
      });
    }
  }

  async seasonFind(options: FindSeasonByIdOptions): Promise<Season> {
    return (await this.seasons.child(options.seasonId).get()).val();
  }
  async seasonCreate(options: CreateSeasonOptions): Promise<Season> {
    const season: Season = {
      ...options,
      episodes: [],
      languages: [],
      subtitles: []
    };
    await this.seasons.child(season.id).set(season);
    const seasons = ((await this.collectionFind({ collectionId: options.collectionId })).seasons ?? []).concat(season.id);
    await this.collections.child(options.collectionId).child("seasons").set(seasons);
    return season;
  }
  async seasonPatch(options: PatchSeasonOptiopns): Promise<void> {
    if (options.index !== undefined) {
      await this.seasons.child(options.seasonId).child("index").set(options.index);
    }
  }
  async seasonDelete(options: DeleteSeasonOptions): Promise<void> {
    const season = await this.seasonFind({ seasonId: options.seasonId });
    await this.seasons.child(season.id).remove();
    const collection = await this.collectionFind({ collectionId: season.collectionId });
    collection.seasons = (collection.seasons ?? []).filter((seasonId) => seasonId !== season.id);
    await this.collections.child(collection.id).child("seasons").set(collection.seasons);
    if (season.episodes && season.episodes.length !== 0) {
      season.episodes.forEach(async (episodeId) => {
        await this.episodeDelete({ seasonId: season.id, episodeId: episodeId });
      });
    }
  }

  async episodeFind(options: FindEpisodeByIdOptions): Promise<Episode> {
    return (await this.episodes.child(options.seasonId).child(options.episodeId).get()).val();
  }
  async episodeCreate(options: CreateEpisodeOptions): Promise<Episode> {
    const episode: Episode = {
      ...options,
      sources: [],
      creationDate: Date.now()
    };
    await this.episodes.child(options.seasonId).child(episode.id).set(episode);
    const episodes = ((await this.seasonFind({ seasonId: options.seasonId })).episodes ?? []).concat(episode.id);
    await this.seasons.child(options.seasonId).child("episodes").set(episodes);
    return episode;
  }
  async episodePatch(options: PatchEpisodeOptiopns): Promise<void> {
    if (options.index !== undefined) {
      await this.episodes.child(options.seasonId).child(options.episodeId).child("index").set(options.index);
    }
    if (options.name !== undefined) {
      await this.episodes.child(options.seasonId).child(options.episodeId).child("name").set(options.name);
    }
  }
  async episodeDelete(options: DeleteEpisodeOptions): Promise<void> {
    const episode = await this.episodeFind({ seasonId: options.seasonId, episodeId: options.episodeId });
    await this.episodes.child(options.seasonId).child(episode.id).remove();
    const season = await this.seasonFind({ seasonId: options.seasonId });
    season.episodes = (season.episodes ?? []).filter((episodeId) => episodeId !== episode.id);
    await this.seasons.child(season.id).child("episodes").set(season.episodes);
    if (episode.sources && episode.sources.length !== 0) {
      episode.sources.forEach(async (sourceId) => {
        await this.sourceDelete({ seasonId: season.id, episodeId: episode.id, sourceId: sourceId });
      });
    }
  }

  async sourceFind(options: FindSourceByIdOptions): Promise<Source> {
    return (await this.sources.child(options.sourceId).get()).val();
  }
  async sourceCreate(options: CreateSourceOptions): Promise<Source> {
    const source: Source = {
      ...options,
      name: options.name ?? null,
      url: options.url ?? null,
      key: options.key ?? null,
      subtitles: options.subtitles ?? null,
      creationDate: Date.now()
    };
    await this.sources.child(options.id).set(source);
    const sources = ((await this.episodeFind({ seasonId: options.seasonId, episodeId: options.episodeId })).sources ?? []).concat(source.id);
    await this.episodes.child(options.seasonId).child(options.episodeId).child("sources").set(sources);
    await this.updateLanguages({ seasonId: options.seasonId });
    await this.updateSubtitles({ seasonId: options.seasonId });
    return source;
  }
  async sourcePatch(options: PatchSourceOptiopns): Promise<void> {
    if (options.language !== undefined) {
      await this.sources.child(options.sourceId).child("language").set(options.language);
    }
    if (options.name !== undefined) {
      await this.sources.child(options.sourceId).child("name").set(options.name);
    }
    if (options.url !== undefined) {
      await this.sources.child(options.sourceId).child("url").set(options.url);
    }
    if (options.key !== undefined) {
      await this.sources.child(options.sourceId).child("key").set(options.key);
    }
    if (options.subtitles !== undefined) {
      await this.sources.child(options.sourceId).child("subtitles").set(options.subtitles);
    }
    if (options.language || options.subtitles) {
      await this.updateLanguages({ seasonId: options.seasonId });
      await this.updateSubtitles({ seasonId: options.seasonId });
    }
  }
  async sourceDelete(options: DeleteSourceOptions): Promise<void> {
    const source = await this.sourceFind({ sourceId: options.sourceId });
    await this.sources.child(source.id).remove();
    const episode = await this.episodeFind({ seasonId: options.seasonId, episodeId: options.episodeId });
    episode.sources = (episode.sources ?? []).filter((sourceId) => sourceId !== source.id);
    await this.episodes.child(options.seasonId).child(options.episodeId).child("sources").set(episode.sources);
    await this.updateLanguages({ seasonId: options.seasonId });
    await this.updateSubtitles({ seasonId: options.seasonId });
  }

  private async updateLanguages(options: { seasonId: string }) {
    const season = await this.seasonFind({ seasonId: options.seasonId });

    const languages = (
      await Promise.all(
        season.episodes.map(
          async (episodeId) =>
            await Promise.all(
              (
                await this.episodeFind({ seasonId: season.id, episodeId: episodeId })
              ).sources.map(async (sourceId) => (await this.sourceFind({ sourceId: sourceId })).language)
            )
        )
      )
    ).flat();
    await this.seasons
      .child(season.id)
      .child("languages")
      .set([...new Set(languages)]);
  }

  private async updateSubtitles(options: { seasonId: string }) {
    const season = await this.seasonFind({ seasonId: options.seasonId });
    const subtitles = (
      await Promise.all(
        season.episodes.map(
          async (episodeId) =>
            await Promise.all(
              (
                await this.episodeFind({ seasonId: season.id, episodeId: episodeId })
              ).sources.map(async (sourceId) => (await this.sourceFind({ sourceId: sourceId })).subtitles)
            )
        )
      )
    )
      .flat()
      .filter((subtitles) => !!subtitles);
    await this.seasons
      .child(season.id)
      .child("subtitles")
      .set([...new Set(subtitles)]);
  }

  async authorizationCodesFind(options: FindAuthorizationCodeOptions): Promise<AuthorizationCode> {
    return (await this.authorizationCodes.child(options.authorizationCode).get()).val();
  }
  async authorizationCodesRemove(options: RemoveAuthorizationCodeOptions): Promise<void> {
    await this.authorizationCodes.child(options.authorizationCode).remove();
  }
  async authorizationCodesSave(options: SaveAuthorizationCodeOptions): Promise<void> {
    const authorizationCode: AuthorizationCode = {
      ...options,
      creationDate: Date.now()
    };
    await this.authorizationCodes.child(options.code).set(authorizationCode);
  }

  async accessTokenFind(options: FindAccessTokenOptions): Promise<ApplicationToken> {
    return (await this.accessTokens.child(options.accessToken).get()).val();
  }
  async accessTokenFindByIds(options: FindAccessTokenByIdOptions): Promise<ApplicationToken> {
    const references = (
      await this.tokens.child(options.uid).child("accessTokens").orderByChild("applicationId").equalTo(options.applicationId).get()
    ).val();
    const reference = references ? references[Object.keys(references)[0]] : undefined;
    return reference ? (await this.accessTokens.child(reference.token).get()).val() : undefined;
  }
  async accessTokenSave(options: SaveAccessTokenOptions): Promise<ApplicationToken> {
    const accessToken: ApplicationToken = {
      ...options,
      creationDate: Date.now()
    };
    await this.accessTokens.child(options.token).set(accessToken);
    const tokenReference: TokenReference = {
      token: options.token,
      applicationId: options.applicationId
    };
    await this.tokens.child(options.uid).child("accessTokens").child(options.token).set(tokenReference);
    return accessToken;
  }
  async accessTokenRemoveByIds(options: RemoveAccessTokenByIdsOptions): Promise<void> {
    const accessToken = await this.accessTokenFindByIds({ uid: options.uid, applicationId: options.applicationId });
    if (accessToken) {
      await this.accessTokens.child(accessToken.token).remove();
      await this.tokens.child(accessToken.uid).child("accessTokens").child(accessToken.token).remove();
    }
  }

  async refreshTokenFind(options: FindRefreshTokenOptions): Promise<ApplicationToken> {
    return (await this.refreshTokens.child(options.refreshToken).get()).val();
  }
  async refreshTokenFindByIds(options: FindRefreshTokenByIdOptions): Promise<ApplicationToken> {
    const references = (
      await this.tokens.child(options.uid).child("refreshTokens").orderByChild("applicationId").equalTo(options.applicationId).get()
    ).val();
    const reference = references ? references[Object.keys(references)[0]] : undefined;
    return reference ? (await this.refreshTokens.child(reference.token).get()).val() : undefined;
  }
  async refreshTokenSave(options: SaveRefreshTokenOptions): Promise<ApplicationToken> {
    const refreshToken: ApplicationToken = {
      ...options,
      creationDate: Date.now()
    };
    await this.refreshTokens.child(options.token).set(refreshToken);
    const tokenReference: TokenReference = {
      token: options.token,
      applicationId: options.applicationId
    };
    await this.tokens.child(options.uid).child("refreshTokens").child(options.token).set(tokenReference);
    return refreshToken;
  }
  async refreshTokenRemoveByIds(options: RemoveRefreshTokenByIdsOptions): Promise<void> {
    const refreshToken = await this.refreshTokenFindByIds({ uid: options.uid, applicationId: options.applicationId });
    if (refreshToken) {
      await this.refreshTokens.child(refreshToken.token).remove();
      await this.tokens.child(refreshToken.uid).child("refreshTokens").child(refreshToken.token).remove();
    }
  }
}
