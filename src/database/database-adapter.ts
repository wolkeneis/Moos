export default interface DatabaseAdapter {
  clientFindById(options: FindClientByIdOptions, done: FindClientByIdDoneFunction): void;
  clientCreate(options: CreateClientOptions, done: CreateClientDoneFunction): void;
  clientUpdateName(options: UpdateClientNameOptions, done: UpdateClientNameDoneFunction): void;
  clientUpdateRedirectUri(options: UpdateClientRedirectUriOptions, done: UpdateClientRedirectUriDoneFunction): void;
  clientRegenerateSecret(options: RegenerateClientSecretOptions, done: RegenerateClientSecretDoneFunction): void;
  clientCheckSecret(options: CheckClientSecretOptions, done: CheckClientSecretDoneFunction): void;

  userFindById(options: FindUserByIdOptions, done: FindUserByIdDoneFunction): void;
  userUpdateOrCreate(options: UpdateOrCreateUserOptions, done: UpdateOrCreateUserDoneFunction): void;

  authorizationCodesFind(options: FindAuthorizationCodeOptions, done: FindAuthorizationCodeDoneFunction): void;
  authorizationCodesSave(options: SaveAuthorizationCodeOptions, done: SaveAuthorizationCodeDoneFunction): void;

  accessTokenFind(options: FindAccessTokenOptions, done: FindAccessTokenDoneFunction): void;
  accessTokenFindByIds(options: FindAccessTokenByIdOptions, done: FindAccessTokenDoneFunction): void;
  accessTokenSave(options: SaveAccessTokenOptions, done: SaveAccessTokenDoneFunction): void;
  accessTokenRemoveByIds(options: RemoveAccessTokenByIdsOptions, done: RemoveAccessTokenByIdsDoneFunction): void;

  refreshTokenFind(options: FindRefreshTokenOptions, done: FindRefreshTokenDoneFunction): void;
  refreshTokenFindByIds(options: FindRefreshTokenByIdOptions, done: FindRefreshTokenDoneFunction): void;
  refreshTokenSave(options: SaveRefreshTokenOptions, done: SaveRefreshTokenDoneFunction): void;
  refreshTokenRemoveByIds(options: RemoveRefreshTokenByIdsOptions, done: RemoveRefreshTokenByIdsDoneFunction): void;
}

export type DatabaseError = Error | null;

export type AuthProvider = "github" | "discord" | "google" | "twitter" | "email" | "spotify";

export type Client = {
  id: string;
  name: string;
  redirectUri: string;
  secret: string;
  trusted?: boolean;
  owner: string;
};

export type User = {
  uid: string;
  username: string;
  avatar: string;
  scopes: Array<string>;
  providers: ProviderReferences;
  private?: boolean;
};

export type ProviderReferences = {
  discord?: string;
};

export type ProviderProfile = {
  uid: string;
  providerId: string;
  username: string;
  avatar?: string;
  accessToken: string;
  refreshToken?: string;
};

export type AuthorizationCode = {
  code: string;
  clientId: string;
  redirectUri: string;
  uid: string;
};

export type UserClientToken = {
  token: string;
  clientId: string;
  uid: string;
};

export type FindClientByIdOptions = {
  clientId: string;
};

export type CreateClientOptions = {
  uid: string;
  name: string;
  redirectUri: string;
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

export type UpdateOrCreateUserOptions = {
  provider: AuthProvider;
  providerId: string;
  username: string;
  avatar?: string;
  accessToken: string;
  refreshToken?: string;
};

export type FindAuthorizationCodeOptions = {
  authorizationCode: string;
};

export type SaveAuthorizationCodeOptions = {
  authorizationCode: AuthorizationCode;
};

export type FindAccessTokenOptions = {
  accessToken: string;
};

export type FindAccessTokenByIdOptions = {
  clientId: string;
  uid: string;
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
  clientId: string;
  uid: string;
};

export type SaveRefreshTokenOptions = {
  refreshToken: UserClientToken;
};

export type RemoveRefreshTokenByIdsOptions = {
  refreshToken: UserClientToken;
};

export type FindAuthorizationCodeDoneFunction = (error: DatabaseError, authorizationCode?: AuthorizationCode) => void;

export type SaveAuthorizationCodeDoneFunction = (error: DatabaseError) => void;

export type FindAccessTokenDoneFunction = (error: DatabaseError, accessToken?: UserClientToken | undefined) => void;

export type SaveAccessTokenDoneFunction = (error: DatabaseError) => void;

export type RemoveAccessTokenByIdsDoneFunction = (error: DatabaseError) => void;

export type FindRefreshTokenDoneFunction = (error: DatabaseError, refreshToken?: UserClientToken | undefined) => void;

export type SaveRefreshTokenDoneFunction = (error: DatabaseError) => void;

export type RemoveRefreshTokenByIdsDoneFunction = (error: DatabaseError) => void;

export type FindClientByIdDoneFunction = (error: DatabaseError, client?: Client) => void;

export type CreateClientDoneFunction = (error: DatabaseError, secret?: string) => void;

export type UpdateClientNameDoneFunction = (error: DatabaseError) => void;

export type UpdateClientRedirectUriDoneFunction = (error: DatabaseError) => void;

export type RegenerateClientSecretDoneFunction = (error: DatabaseError, secret?: string) => void;

export type CheckClientSecretDoneFunction = (error: DatabaseError, successful?: boolean) => void;

export type FindUserByIdDoneFunction = (error: DatabaseError, user?: User) => void;

export type UpdateOrCreateUserDoneFunction = (error: DatabaseError, user?: User) => void;
