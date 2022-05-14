export type ApplicationSecret = string;

export type CheckResult = boolean;

export type AuthProvider = "discord" | "google";

export interface User {
  uid: string;
  username: string;
  avatar: string | null;
  scopes: "*"[];
  private: boolean;
  providers?: ProviderReferences;
  applications: Array<string>;
  creationDate: number;
}

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

export interface Application {
  id: string;
  name: string;
  redirectUri: string;
  owner: string;
  secret: string;
  trusted: boolean;
  creationDate: number;
}

export type AuthorizationCode = {
  code: string;
  applicationId: string;
  redirectUri: string;
  uid: string;
  creationDate: number;
};

export type ApplicationToken = {
  token: string;
  uid: string;
  applicationId: string;
  creationDate: number;
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

  userFindById(options: FindUserByIdOptions): Promise<User>;
  userCreate(options: CreateUserOptions): Promise<void>;
  userPatch(options: PatchUserOptiopns): Promise<void>;
  userProviderProfileUpdateOrCreate(options: UpdateOrCreateProviderProfileOptions): Promise<ProviderProfile>;
  userProviderProfileFindById(options: FindProviderProfileByIdOptions): Promise<ProviderProfile>;

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
};

export type RemoveRefreshTokenByIdsOptions = {
  uid: string;
  applicationId: string;
};
