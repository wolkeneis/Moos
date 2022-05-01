export type ClientSecret = string;

export type CheckResult = boolean;

export type AuthProvider = "discord";

export type Client = {
  id: string;
  name: string;
  redirectUri: string;
  secret: string;
  trusted: boolean;
  owner: string;
};

export type User = {
  uid: string;
  username: string;
  avatar: string | null;
  scopes: Array<string>;
  providers?: ProviderReferences;
  private: boolean;
};

export type ProviderReferences = {
  discord?: string;
};

export type ProviderProfile = {
  providerId: string;
  uid: string;
  username: string;
  avatar: string | null;
  accessToken: string;
  refreshToken: string | null;
};

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
  userProviderProfileUpdateOrCreate(options: UpdateOrCreateProviderProfileOptions): Promise<ProviderProfile>;
  userProviderProfileFindById(options: FindProviderProfileByIdOptions): Promise<ProviderProfile>;

  authorizationCodesFind(options: FindAuthorizationCodeOptions): Promise<AuthorizationCode>;
  authorizationCodesRemove(options: RemoveAuthorizationCodeOptions): Promise<void>;
  authorizationCodesSave(options: SaveAuthorizationCodeOptions): Promise<void>;

  accessTokenFind(options: FindAccessTokenOptions): Promise<UserClientToken>;
  accessTokenFindByIds(options: FindAccessTokenByIdOptions): Promise<UserClientToken>;
  accessTokenSave(options: SaveAccessTokenOptions): Promise<void>;
  accessTokenRemoveByIds(options: RemoveAccessTokenByIdsOptions): Promise<void>;

  refreshTokenFind(options: FindRefreshTokenOptions): Promise<UserClientToken>;
  refreshTokenFindByIds(options: FindRefreshTokenByIdOptions): Promise<UserClientToken>;
  refreshTokenSave(options: SaveRefreshTokenOptions): Promise<void>;
  refreshTokenRemoveByIds(options: RemoveRefreshTokenByIdsOptions): Promise<void>;
}

export type FindClientByIdOptions = {
  clientId: string;
};

export type CreateClientOptions = {
  id: string;
  name: string;
  redirectUri: string;
  ownerUid: string;
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
  scopes: Array<string>;
  private: boolean;
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
  authorizationCode: AuthorizationCode;
};

export type FindAccessTokenOptions = {
  accessToken: string;
};

export type FindAccessTokenByIdOptions = {
  uid: string;
  clientId: string;
};

export type SaveAccessTokenOptions = {
  accessToken: UserClientToken;
};

export type RemoveAccessTokenByIdsOptions = {
  accessToken: UserClientToken;
};

export type FindRefreshTokenOptions = {
  refreshToken: string;
};

export type FindRefreshTokenByIdOptions = {
  uid: string;
  clientId: string;
};

export type SaveRefreshTokenOptions = {
  refreshToken: UserClientToken;
};

export type RemoveRefreshTokenByIdsOptions = {
  refreshToken: UserClientToken;
};
