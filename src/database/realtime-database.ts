import { Database } from "firebase-admin/lib/database/database";
import DatabaseAdapter, {
  AuthorizationCode,
  CheckClientSecretOptions,
  Client,
  CreateClientOptions,
  CreateUserOptions,
  FindAccessTokenByIdOptions,
  FindAccessTokenOptions,
  FindAuthorizationCodeOptions,
  FindClientByIdOptions,
  FindProviderProfileByIdOptions,
  FindRefreshTokenByIdOptions,
  FindRefreshTokenOptions,
  FindUserByIdOptions,
  ProviderProfile,
  RegenerateClientSecretOptions,
  RemoveAccessTokenByIdsOptions,
  RemoveRefreshTokenByIdsOptions,
  SaveAccessTokenOptions,
  SaveAuthorizationCodeOptions,
  SaveRefreshTokenOptions,
  UpdateClientNameOptions,
  UpdateClientRedirectUriOptions,
  UpdateOrCreateProviderProfileOptions,
  User,
  UserClientToken
} from "./database-adapter";
import argon2 from "argon2";
import crypto from "crypto";
import {Reference} from "firebase-admin/database";

function _randomToken(length: number): string {
  return crypto.randomBytes(length).toString("hex");
}

export default class RealtimeDatabaseImpl implements DatabaseAdapter {
  database: Database;
  clients: Reference;
  profiles: Reference;
  providers: Reference;

  constructor(database: Database) {
    this.database = database;
    this.clients = database.ref("clients");
    this.profiles = database.ref("profiles");
    this.providers = database.ref("providers");
  }
  async clientFindById(options: FindClientByIdOptions): Promise<Client> {
    return (await this.clients.child(options.clientId).get()).val();
  }
  async clientCreate(options: CreateClientOptions): Promise<string> {
    const token = _randomToken(256);
    const secret: string = await argon2.hash(token, {
      type: argon2.argon2id,
      timeCost: 2, //Iterations
      memoryCost: 16384, //Memory Size
      parallelism: 1 //Threads
    });
    const client: Client = {
      id: options.id,
      name: options.name,
      redirectUri: options.redirectUri,
      owner: options.ownerUid,
      secret: secret,
      trusted: false
    };
    await this.clients.child(options.id).set(client);
    return token;
  }
  async clientUpdateName(options: UpdateClientNameOptions): Promise<void> {
    await this.clients.child(options.clientId).child("name").update(options.name);
  }
  async clientUpdateRedirectUri(options: UpdateClientRedirectUriOptions): Promise<void> {
    await this.clients.child(options.clientId).child("redirectUri").update(options.redirectUri);
  }
  async clientRegenerateSecret(options: RegenerateClientSecretOptions): Promise<string> {
    const token = _randomToken(256);
    const secret: string = await argon2.hash(token, {
      type: argon2.argon2id,
      timeCost: 2, //Iterations
      memoryCost: 16384, //Memory Size
      parallelism: 1 //Threads
    });
    await this.clients.child(options.clientId).child("secret").update(secret);
    return token;
  }
  async clientCheckSecret(options: CheckClientSecretOptions): Promise<boolean> {
    const secret = (await this.clients.child(options.clientId).child("secret").get()).val();
    return await argon2.verify(secret, options.secret);
  }
  async userFindById(options: FindUserByIdOptions): Promise<User> {
    return (await this.profiles.child(options.uid).get()).val();
  }
  async userCreate(options: CreateUserOptions): Promise<void> {
    const user: User =  {
      uid: options.uid,
      scopes: options.scopes,
      username: options.username,
      avatar: options.avatar,
      private: options.private
    };
    await this.profiles.child(options.uid).set(user);
  }
  async userProviderProfileUpdateOrCreate(options: UpdateOrCreateProviderProfileOptions): Promise<ProviderProfile> {
    const providerProfile: ProviderProfile = {
      providerId: options.providerId,
      uid: options.uid,
      username: options.username,
      avatar: options.avatar,
      accessToken: options.accessToken,
      refreshToken: options.refreshToken,
    }
    await this.providers.child(options.provider).child(options.providerId).set(providerProfile);
    return providerProfile;
  }
  async userProviderProfileFindById(options: FindProviderProfileByIdOptions): Promise<ProviderProfile> {
    return (await this.providers.child(options.provider).child(options.providerId).get()).val()
  }
  authorizationCodesFind(options: FindAuthorizationCodeOptions): Promise<AuthorizationCode> {
    return (await).val();
  }
  authorizationCodesSave(options: SaveAuthorizationCodeOptions): Promise<void> {
    throw new Error("Method not implemented.");
  }
  accessTokenFind(options: FindAccessTokenOptions): Promise<UserClientToken> {
    throw new Error("Method not implemented.");
  }
  accessTokenFindByIds(options: FindAccessTokenByIdOptions): Promise<UserClientToken> {
    throw new Error("Method not implemented.");
  }
  accessTokenSave(options: SaveAccessTokenOptions): Promise<void> {
    throw new Error("Method not implemented.");
  }
  accessTokenRemoveByIds(options: RemoveAccessTokenByIdsOptions): Promise<void> {
    throw new Error("Method not implemented.");
  }
  refreshTokenFind(options: FindRefreshTokenOptions): Promise<UserClientToken> {
    throw new Error("Method not implemented.");
  }
  refreshTokenFindByIds(options: FindRefreshTokenByIdOptions): Promise<UserClientToken> {
    throw new Error("Method not implemented.");
  }
  refreshTokenSave(options: SaveRefreshTokenOptions): Promise<void> {
    throw new Error("Method not implemented.");
  }
  refreshTokenRemoveByIds(options: RemoveRefreshTokenByIdsOptions): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
