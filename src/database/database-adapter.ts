export type ApplicationSecret = string;

export type CheckResult = boolean;

export const enum AuthProvider {
  discord = "discord",
  google = "google"
}

export enum AuthScope {
  identify = "identify",
  all = "*",
  files = "files"
}

export enum Language {
  en_EN = "en_EN",
  de_DE = "de_DE",
  ja_JP = "ja_JP",
  zh_CN = "zh_CN"
}

export const enum Visibility {
  public = "public",
  private = "private",
  unlisted = "unlisted"
}

export type Profile = {
  uid: string;
  username: string;
  avatar: string | null;
  scopes?: "*"[];
  private: boolean;
  providers?: ProviderReferences;
  applications?: string[];
  files?: string[];
  collections?: string[];
  friends?: string[];
  creationDate: number;
};

export type Friend = {
  uid: string;
  username: string;
  avatar: string | null;
  scopes?: "*"[];
  private: boolean;
  providers?: ProviderReferences;
  applications?: string[];
  files?: string[];
  collections?: string[];
  friends?: string[];
  creationDate: number;
};

export type ProviderReferences = {
  [key in AuthProvider]?: string;
};

export type ProviderProfile = {
  provider: AuthProvider;
  uid: string;
  providerId: string;
  username: string;
  avatar: string | null;
  accessToken: string;
  refreshToken: string | null;
};

export type Application = {
  id: string;
  name: string;
  redirectUri: string;
  owner: string;
  secret: string;
  trusted: boolean;
  creationDate: number;
};

export type File = {
  id: string;
  name: string;
  owner: string;
  private: boolean;
  creationDate: number;
};

export type Collection = {
  id: string;
  name: string;
  visibility: "public" | "private" | "unlisted";
  seasons: string[];
  thumbnail: string | null;
  owner: string;
  creationDate: number;
};

export type Season = {
  collectionId: string;
  id: string;
  index: number;
  episodes: string[];
  languages: Language[];
  subtitles: Language[];
};

export type Episode = {
  seasonId: string;
  id: string;
  index: number;
  name: string;
  sources: string[];
  creationDate: number;
};

export type Source = {
  seasonId: string;
  episodeId: string;
  id: string;
  language: Language;
  name: string | null;
  url: string | null;
  key: string | null;
  subtitles: Language | null;
  creationDate: number;
};

export type AuthorizationCode = {
  code: string;
  applicationId: string;
  redirectUri: string;
  uid: string;
  creationDate: number;
  scope: AuthScope[];
};

export type ApplicationToken = {
  token: string;
  uid: string;
  applicationId: string;
  creationDate: number;
  scope: AuthScope[];
};

export type TokenReference = {
  token: string;
  applicationId: string;
};

export default interface DatabaseAdapter {
  applicationFindById(options: FindApplicationByIdOptions): Promise<Application>;
  applicationCreate(options: CreateApplicationOptions): Promise<ApplicationSecret>;
  applicationUpdateName(options: UpdateApplicationNameOptions): Promise<void>;
  applicationUpdateRedirectUri(options: UpdateApplicationRedirectUriOptions): Promise<void>;
  applicationRegenerateSecret(options: RegenerateApplicationSecretOptions): Promise<ApplicationSecret>;
  applicationCheckSecret(options: CheckApplicationSecretOptions): Promise<CheckResult>;

  userFindById(options: FindUserByIdOptions): Promise<Profile>;
  userCreate(options: CreateUserOptions): Promise<void>;
  userPatch(options: PatchUserOptiopns): Promise<void>;
  userProviderProfileUpdateOrCreate(options: UpdateOrCreateProviderProfileOptions): Promise<ProviderProfile>;
  userProviderProfileFindById(options: FindProviderProfileByIdOptions): Promise<ProviderProfile>;

  friendAdd(options: AddFriendOptions): Promise<void>;
  friendRemove(options: DeleteFriendOptions): Promise<void>;

  fileFind(options: FindFileByIdOptions): Promise<File>;
  fileCreate(options: CreateFileOptions): Promise<void>;
  filePatch(options: PatchFileOptiopns): Promise<void>;
  fileDelete(options: DeleteFileOptions): Promise<void>;

  collectionFind(options: FindCollectionByIdOptions): Promise<Collection>;
  collectionCreate(options: CreateCollectionOptions): Promise<Collection>;
  collectionPatch(options: PatchCollectionOptiopns): Promise<void>;
  collectionDelete(options: DeleteCollectionOptions): Promise<void>;

  seasonFind(options: FindSeasonByIdOptions): Promise<Season>;
  seasonCreate(options: CreateSeasonOptions): Promise<Season>;
  seasonPatch(options: PatchSeasonOptiopns): Promise<void>;
  seasonDelete(options: DeleteSeasonOptions): Promise<void>;

  episodeFind(options: FindEpisodeByIdOptions): Promise<Episode>;
  episodeCreate(options: CreateEpisodeOptions): Promise<Episode>;
  episodePatch(options: PatchEpisodeOptiopns): Promise<void>;
  episodeDelete(options: DeleteEpisodeOptions): Promise<void>;

  sourceFind(options: FindSourceByIdOptions): Promise<Source>;
  sourceCreate(options: CreateSourceOptions): Promise<Source>;
  sourcePatch(options: PatchSourceOptiopns): Promise<void>;
  sourceDelete(options: DeleteSourceOptions): Promise<void>;

  authorizationCodesFind(options: FindAuthorizationCodeOptions): Promise<AuthorizationCode>;
  authorizationCodesRemove(options: RemoveAuthorizationCodeOptions): Promise<void>;
  authorizationCodesSave(options: SaveAuthorizationCodeOptions): Promise<void>;

  accessTokenFind(options: FindAccessTokenOptions): Promise<ApplicationToken>;
  accessTokenFindByIds(options: FindAccessTokenByIdOptions): Promise<ApplicationToken>;
  accessTokenSave(options: SaveAccessTokenOptions): Promise<ApplicationToken>;
  accessTokenRemoveByIds(options: RemoveAccessTokenByIdsOptions): Promise<void>;

  refreshTokenFind(options: FindRefreshTokenOptions): Promise<ApplicationToken>;
  refreshTokenFindByIds(options: FindRefreshTokenByIdOptions): Promise<ApplicationToken>;
  refreshTokenSave(options: SaveRefreshTokenOptions): Promise<ApplicationToken>;
  refreshTokenRemoveByIds(options: RemoveRefreshTokenByIdsOptions): Promise<void>;
}

export type FindApplicationByIdOptions = {
  applicationId: string;
};

export type CreateApplicationOptions = {
  id: string;
  name: string;
  redirectUri: string;
  owner: string;
};

export type UpdateApplicationNameOptions = {
  applicationId: string;
  name: string;
};

export type UpdateApplicationRedirectUriOptions = {
  applicationId: string;
  redirectUri: URL;
};

export type RegenerateApplicationSecretOptions = {
  applicationId: string;
};

export type CheckApplicationSecretOptions = {
  applicationId: string;
  secret: string;
};

export type FindFileByIdOptions = {
  fileId: string;
};

export type CreateFileOptions = {
  id: string;
  name: string;
  owner: string;
  private?: boolean;
};

export type PatchFileOptiopns = {
  fileId: string;
  name?: string;
  private?: boolean;
};

export type DeleteFileOptions = {
  fileId: string;
};

export type FindCollectionByIdOptions = {
  collectionId: string;
};

export type CreateCollectionOptions = {
  id: string;
  name: string;
  visibility: "public" | "private" | "unlisted";
  thumbnail?: string;
  owner: string;
};

export type PatchCollectionOptiopns = {
  collectionId: string;
  name?: string;
  visibility?: "public" | "private" | "unlisted";
  thumbnail?: string;
};

export type DeleteCollectionOptions = {
  collectionId: string;
};

export type FindSeasonByIdOptions = {
  seasonId: string;
};

export type CreateSeasonOptions = {
  collectionId: string;
  id: string;
  index: number;
};

export type PatchSeasonOptiopns = {
  seasonId: string;
  index: number;
};

export type DeleteSeasonOptions = {
  seasonId: string;
};

export type FindEpisodeByIdOptions = {
  seasonId: string;
  episodeId: string;
};

export type CreateEpisodeOptions = {
  seasonId: string;
  id: string;
  index: number;
  name: string;
};

export type PatchEpisodeOptiopns = {
  seasonId: string;
  episodeId: string;
  index?: number;
  name?: string;
};

export type DeleteEpisodeOptions = {
  seasonId: string;
  episodeId: string;
};

export type FindSourceByIdOptions = {
  sourceId: string;
};

export type CreateSourceOptions = {
  seasonId: string;
  episodeId: string;
  id: string;
  language: Language;
  name?: string;
  url?: string;
  key?: string;
  subtitles?: Language;
};

export type PatchSourceOptiopns = {
  seasonId: string;
  episodeId: string;
  sourceId: string;
  language?: Language;
  name?: string;
  url?: string;
  key?: string;
  subtitles?: Language;
};

export type DeleteSourceOptions = {
  seasonId: string;
  episodeId: string;
  sourceId: string;
};

export type FindUserByIdOptions = {
  uid: string;
};

export type CreateUserOptions = {
  uid: string;
  username: string;
  avatar: string | null;
  scopes: "*"[];
  private: boolean;
};

export type PatchUserOptiopns = {
  uid: string;
  private?: boolean;
};

export type AddFriendOptions = {
  uid: string;
  friendId: string;
};

export type DeleteFriendOptions = {
  uid: string;
  friendId: string;
};

export type UpdateOrCreateProviderProfileOptions = {
  provider: AuthProvider;
  providerId: string;
  uid: string;
  username: string;
  avatar: string | null;
  accessToken: string;
  refreshToken: string | null;
};

export type FindProviderProfileByIdOptions = {
  provider: string;
  providerId: string;
};

export type FindAuthorizationCodeOptions = {
  authorizationCode: string;
};

export type RemoveAuthorizationCodeOptions = {
  authorizationCode: string;
};

export type SaveAuthorizationCodeOptions = {
  code: string;
  applicationId: string;
  redirectUri: string;
  uid: string;
  scope: AuthScope[];
};

export type FindAccessTokenOptions = {
  accessToken: string;
};

export type FindAccessTokenByIdOptions = {
  uid: string;
  applicationId: string;
};

export type SaveAccessTokenOptions = {
  token: string;
  uid: string;
  applicationId: string;
  scope: AuthScope[];
};

export type RemoveAccessTokenByIdsOptions = {
  uid: string;
  applicationId: string;
};

export type FindRefreshTokenOptions = {
  refreshToken: string;
};

export type FindRefreshTokenByIdOptions = {
  uid: string;
  applicationId: string;
};

export type SaveRefreshTokenOptions = {
  token: string;
  uid: string;
  applicationId: string;
  scope: AuthScope[];
};

export type RemoveRefreshTokenByIdsOptions = {
  uid: string;
  applicationId: string;
};
