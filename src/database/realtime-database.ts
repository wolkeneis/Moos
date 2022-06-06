import argon2 from "argon2";
import crypto from "crypto";
import { Reference } from "firebase-admin/database";
import { Database } from "firebase-admin/lib/database/database";
import DatabaseAdapter, {
  Application,
  ApplicationToken,
  AuthorizationCode,
  CheckApplicationSecretOptions,
  CreateApplicationOptions,
  CreateFileOptions,
  CreateUserOptions,
  DeleteFileOptions,
  File,
  FindAccessTokenByIdOptions,
  FindAccessTokenOptions,
  FindApplicationByIdOptions,
  FindAuthorizationCodeOptions,
  FindFileByIdOptions,
  FindProviderProfileByIdOptions,
  FindRefreshTokenByIdOptions,
  FindRefreshTokenOptions,
  FindUserByIdOptions,
  PatchFileOptiopns,
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
    await this.profiles.child(options.owner).child("files").update(files);
  }
  async filePatch(options: PatchFileOptiopns): Promise<void> {
    if (options.name !== undefined) {
      await this.files.child(options.fileId).child("name").set(options.name);
    } else if (options.private !== undefined) {
      await this.files.child(options.fileId).child("private").set(options.private);
    }
  }
  async fileDelete(options: DeleteFileOptions): Promise<void> {
    const file = await this.fileFind({ fileId: options.fileId });
    await this.files.child(file.id).remove();
    const profile = await this.userFindById({ uid: file.owner });
    profile.files.filter((fileId) => fileId !== file.id);
    await this.profiles.child(file.owner).child("files").update(profile.files);
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
