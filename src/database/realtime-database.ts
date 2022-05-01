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
  ProviderReferences,
  RegenerateClientSecretOptions,
  RemoveAccessTokenByIdsOptions,
  RemoveAuthorizationCodeOptions,
  RemoveRefreshTokenByIdsOptions,
  SaveAccessTokenOptions,
  SaveAuthorizationCodeOptions,
  SaveRefreshTokenOptions,
  TokenReference,
  UpdateClientNameOptions,
  UpdateClientRedirectUriOptions,
  UpdateOrCreateProviderProfileOptions,
  User,
  UserClientToken
} from "./database-adapter";
import argon2 from "argon2";
import crypto from "crypto";
import { Reference } from "firebase-admin/database";

function _randomToken(length: number): string {
  return crypto.randomBytes(length).toString("hex");
}

export default class RealtimeDatabaseImpl implements DatabaseAdapter {
  database: Database;
  clients: Reference;
  profiles: Reference;
  providers: Reference;
  authorizationCodes: Reference;
  accessTokens: Reference;
  refreshTokens: Reference;
  tokens: Reference;

  constructor(database: Database) {
    this.database = database;
    this.clients = database.ref("clients");
    this.profiles = database.ref("profiles");
    this.providers = database.ref("providers");
    this.authorizationCodes = database.ref("authorizationCodes");
    this.accessTokens = database.ref("accessTokens");
    this.refreshTokens = database.ref("refreshTokens");
    this.tokens = database.ref("tokens");
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
    await this.profiles.child(options.ownerUid).child("clients").push(options.id);
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
    const user: User = {
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
      refreshToken: options.refreshToken
    };
    await this.providers.child(options.provider).child(options.providerId).update(providerProfile);
    const providerReferences: ProviderReferences = {};
    providerReferences[options.provider] = options.providerId;
    await this.profiles.child(options.uid).update({
      providers: providerReferences
    });
    return providerProfile;
  }
  async userProviderProfileFindById(options: FindProviderProfileByIdOptions): Promise<ProviderProfile> {
    return (await this.providers.child(options.provider).child(options.providerId).get()).val();
  }

  async authorizationCodesFind(options: FindAuthorizationCodeOptions): Promise<AuthorizationCode> {
    return (await this.authorizationCodes.child(options.authorizationCode).get()).val();
  }
  async authorizationCodesRemove(options: RemoveAuthorizationCodeOptions): Promise<void> {
    await this.authorizationCodes.child(options.authorizationCode).remove();
  }
  async authorizationCodesSave(options: SaveAuthorizationCodeOptions): Promise<void> {
    await this.authorizationCodes.child(options.authorizationCode.code).set(options.authorizationCode);
  }

  async accessTokenFind(options: FindAccessTokenOptions): Promise<UserClientToken> {
    return (await this.accessTokens.child(options.accessToken).get()).val();
  }
  async accessTokenFindByIds(options: FindAccessTokenByIdOptions): Promise<UserClientToken> {
    const reference = (await this.tokens.child(options.uid).child("accessTokens").orderByChild("clientId").equalTo(options.clientId).get()).val();
    return (await this.accessTokens.child(reference.token).get()).val();
  }
  async accessTokenSave(options: SaveAccessTokenOptions): Promise<void> {
    await this.accessTokens.child(options.accessToken.token).set(options.accessToken);
    const tokenReference: TokenReference = {
      token: options.accessToken.token,
      clientId: options.accessToken.clientId
    };
    await this.tokens.child(options.accessToken.uid).child("accessTokens").child(options.accessToken.token).set(tokenReference);
  }
  async accessTokenRemoveByIds(options: RemoveAccessTokenByIdsOptions): Promise<void> {
    await this.accessTokens.child(options.accessToken.token).remove();
    await this.tokens.child(options.accessToken.uid).child("accessTokens").child(options.accessToken.token).remove();
  }

  async refreshTokenFind(options: FindRefreshTokenOptions): Promise<UserClientToken> {
    return (await this.refreshTokens.child(options.refreshToken).get()).val();
  }
  async refreshTokenFindByIds(options: FindRefreshTokenByIdOptions): Promise<UserClientToken> {
    const reference = (await this.tokens.child(options.uid).child("refreshTokens").orderByChild("clientId").equalTo(options.clientId).get()).val();
    return (await this.refreshTokens.child(reference.token).get()).val();
  }
  async refreshTokenSave(options: SaveRefreshTokenOptions): Promise<void> {
    await this.refreshTokens.child(options.refreshToken.token).set(options.refreshToken);
    const tokenReference: TokenReference = {
      token: options.refreshToken.token,
      clientId: options.refreshToken.clientId
    };
    await this.tokens.child(options.refreshToken.uid).child("refreshTokens").child(options.refreshToken.token).set(tokenReference);
  }
  async refreshTokenRemoveByIds(options: RemoveRefreshTokenByIdsOptions): Promise<void> {
    await this.refreshTokens.child(options.refreshToken.token).remove();
    await this.tokens.child(options.refreshToken.uid).child("refreshTokens").child(options.refreshToken.token).remove();
  }
}
