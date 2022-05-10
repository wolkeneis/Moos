export type ClientSecret = string;

export type CheckResult = boolean;

export type AuthProvider = "discord";

export interface User {
  uid: string;
  username: string;
  avatar: string | null;
  scopes: "*"[];
  private: boolean;
  providers?: ProviderReferences;
  clients: Array<string>;
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

export interface Client {
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
  clientId: string;
  redirectUri: string;
  uid: string;
  creationDate: number;
};

export type UserClientToken = {
  token: string;
  uid: string;
  clientId: string;
  creationDate: number;
};

export type TokenReference = {
  token: string;
  clientId: string;
};

export default interface DatabaseAdapter {
  clientFindById(options: FindClientByIdOptions): Promise<Client>;
  clientCreate(options: CreateClientOptions): Promise<ClientSecret>;
  clientUpdateName(options: UpdateClientNameOptions): Promise<void>;
  clientUpdateRedirectUri(options: UpdateClientRedirectUriOptions): Promise<void>;
  clientRegenerateSecret(options: RegenerateClientSecretOptions): Promise<ClientSecret>;
  clientCheckSecret(options: CheckClientSecretOptions): Promise<CheckResult>;

  userFindById(options: FindUserByIdOptions): Promise<User>;
  userCreate(options: CreateUserOptions): Promise<void>;
  userPatch(options: PatchUserOptiopns): Promise<void>;
  userProviderProfileUpdateOrCreate(options: UpdateOrCreateProviderProfileOptions): Promise<ProviderProfile>;
  userProviderProfileFindById(options: FindProviderProfileByIdOptions): Promise<ProviderProfile>;

  authorizationCodesFind(options: FindAuthorizationCodeOptions): Promise<AuthorizationCode>;
  authorizationCodesRemove(options: RemoveAuthorizationCodeOptions): Promise<void>;
  authorizationCodesSave(options: SaveAuthorizationCodeOptions): Promise<void>;

  accessTokenFind(options: FindAccessTokenOptions): Promise<UserClientToken>;
  accessTokenFindByIds(options: FindAccessTokenByIdOptions): Promise<UserClientToken>;
  accessTokenSave(options: SaveAccessTokenOptions): Promise<UserClientToken>;
  accessTokenRemoveByIds(options: RemoveAccessTokenByIdsOptions): Promise<void>;

  refreshTokenFind(options: FindRefreshTokenOptions): Promise<UserClientToken>;
  refreshTokenFindByIds(options: FindRefreshTokenByIdOptions): Promise<UserClientToken>;
  refreshTokenSave(options: SaveRefreshTokenOptions): Promise<UserClientToken>;
  refreshTokenRemoveByIds(options: RemoveRefreshTokenByIdsOptions): Promise<void>;
}

export type FindClientByIdOptions = {
  clientId: string;
};

export type CreateClientOptions = {
  id: string;
  name: string;
  redirectUri: string;
  owner: string;
};

export type UpdateClientNameOptions = {
  clientId: string;
  name: string;
};

export type UpdateClientRedirectUriOptions = {
  clientId: string;
  redirectUri: URL;
};

export type RegenerateClientSecretOptions = {
  clientId: string;
};

export type CheckClientSecretOptions = {
  clientId: string;
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
  clientId: string;
  redirectUri: string;
  uid: string;
};

export type FindAccessTokenOptions = {
  accessToken: string;
};

export type FindAccessTokenByIdOptions = {
  uid: string;
  clientId: string;
};

export type SaveAccessTokenOptions = {
  token: string;
  uid: string;
  clientId: string;
};

export type RemoveAccessTokenByIdsOptions = {
  uid: string;
  clientId: string;
};

export type FindRefreshTokenOptions = {
  refreshToken: string;
};

export type FindRefreshTokenByIdOptions = {
  uid: string;
  clientId: string;
};

export type SaveRefreshTokenOptions = {
  token: string;
  uid: string;
  clientId: string;
};

export type RemoveRefreshTokenByIdsOptions = {
  uid: string;
  clientId: string;
};
