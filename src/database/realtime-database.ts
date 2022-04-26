import { Database } from "firebase-admin/lib/database/database";
import DatabaseAdapter, {
  AuthorizationCode,
  CheckClientSecretDoneFunction,
  CheckClientSecretOptions,
  CreateClientDoneFunction,
  CreateClientOptions,
  CreateUserDoneFunction,
  CreateUserOptions,
  DatabaseError,
  FindAccessTokenByIdOptions,
  FindAccessTokenDoneFunction,
  FindAccessTokenOptions,
  FindClientByIdDoneFunction,
  FindClientByIdOptions,
  FindProviderProfileByIdDoneFunction,
  FindProviderProfileByIdOptions,
  FindRefreshTokenByIdOptions,
  FindRefreshTokenDoneFunction,
  FindRefreshTokenOptions,
  FindUserByIdDoneFunction,
  FindUserByIdOptions,
  RegenerateClientSecretDoneFunction,
  RegenerateClientSecretOptions,
  RemoveAccessTokenByIdsDoneFunction,
  RemoveAccessTokenByIdsOptions,
  RemoveRefreshTokenByIdsDoneFunction,
  RemoveRefreshTokenByIdsOptions,
  SaveAccessTokenDoneFunction,
  SaveAccessTokenOptions,
  SaveRefreshTokenDoneFunction,
  SaveRefreshTokenOptions,
  UpdateClientNameDoneFunction,
  UpdateClientNameOptions,
  UpdateClientRedirectUriDoneFunction,
  UpdateClientRedirectUriOptions,
  UpdateOrCreateProviderProfileDoneFunction,
  UpdateOrCreateProviderProfileOptions
} from "./database-adapter";

export default class RealtimeDatabaseImpl implements DatabaseAdapter {
  database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  clientFindById(options: FindClientByIdOptions, done: FindClientByIdDoneFunction): void {
    throw new Error("Method not implemented.");
  }

  clientCreate(options: CreateClientOptions, done: CreateClientDoneFunction): void {
    throw new Error("Method not implemented.");
  }

  clientUpdateName(options: UpdateClientNameOptions, done: UpdateClientNameDoneFunction): void {
    throw new Error("Method not implemented.");
  }

  clientUpdateRedirectUri(options: UpdateClientRedirectUriOptions, done: UpdateClientRedirectUriDoneFunction): void {
    throw new Error("Method not implemented.");
  }

  clientRegenerateSecret(options: RegenerateClientSecretOptions, done: RegenerateClientSecretDoneFunction): void {
    throw new Error("Method not implemented.");
  }

  clientCheckSecret(options: CheckClientSecretOptions, done: CheckClientSecretDoneFunction): void {
    throw new Error("Method not implemented.");
  }

  userFindById(options: FindUserByIdOptions, done: FindUserByIdDoneFunction): void {
    throw new Error("Method not implemented.");
  }

  userCreate(options: CreateUserOptions, done: CreateUserDoneFunction): void {
    throw new Error("Method not implemented.");
  }

  userProviderProfileUpdateOrCreate(options: UpdateOrCreateProviderProfileOptions, done: UpdateOrCreateProviderProfileDoneFunction): void {
    throw new Error("Method not implemented.");
  }

  userProviderProfileFindById(options: FindProviderProfileByIdOptions, done: FindProviderProfileByIdDoneFunction): void {
    throw new Error("Method not implemented.");
  }

  accessTokenFind(options: FindAccessTokenOptions, done: FindAccessTokenDoneFunction): void {
    throw new Error("Method not implemented.");
  }

  accessTokenFindByIds(options: FindAccessTokenByIdOptions, done: FindAccessTokenDoneFunction): void {
    throw new Error("Method not implemented.");
  }

  accessTokenSave(options: SaveAccessTokenOptions, done: SaveAccessTokenDoneFunction): void {
    throw new Error("Method not implemented.");
  }

  accessTokenRemoveByIds(options: RemoveAccessTokenByIdsOptions, done: RemoveAccessTokenByIdsDoneFunction): void {
    throw new Error("Method not implemented.");
  }

  refreshTokenFind(options: FindRefreshTokenOptions, done: FindRefreshTokenDoneFunction): void {
    throw new Error("Method not implemented.");
  }

  refreshTokenFindByIds(options: FindRefreshTokenByIdOptions, done: FindRefreshTokenDoneFunction): void {
    throw new Error("Method not implemented.");
  }

  refreshTokenSave(options: SaveRefreshTokenOptions, done: SaveRefreshTokenDoneFunction): void {
    throw new Error("Method not implemented.");
  }

  refreshTokenRemoveByIds(options: RemoveRefreshTokenByIdsOptions, done: RemoveRefreshTokenByIdsDoneFunction): void {
    throw new Error("Method not implemented.");
  }

  authorizationCodesFind(options: { authorizationCode: string }, done: (error: DatabaseError, authorizationCode: AuthorizationCode) => void): void {
    throw new Error("Method not implemented.");
  }

  authorizationCodesSave(options: { authorizationCode: AuthorizationCode }, done: (error: DatabaseError) => void): void {
    throw new Error("Method not implemented.");
  }
}
