import { CodeExchange, CodeGrant, OAuth2Server, OAuth2Tokens, OAuth2Transaction } from "@wolkeneis/oauth2-server";
import crypto from "crypto";
import database from "./database";
import { Application, AuthScope, User } from "./database/database-adapter";

const server: OAuth2Server = new OAuth2Server(
  async (application: unknown) => (application as Application).id,
  async (applicationId: string) => await database.applicationFindById({ applicationId: applicationId })
);

function randomToken(length: number) {
  return crypto.randomBytes(length).toString("hex");
}

async function issueTokens(applicationId: string, uid: string, scope: AuthScope[]): Promise<OAuth2Tokens> {
  try {
    const user = await database.userFindById({ uid: uid });
    if (!user) throw new Error("User not found");
    await database.accessTokenRemoveByIds({ uid: user.uid, applicationId: applicationId });
    await database.refreshTokenRemoveByIds({ uid: user.uid, applicationId: applicationId });
    const accessToken = await database.accessTokenSave({ token: randomToken(256), uid: user.uid, applicationId: applicationId, scope: scope });
    const refreshToken = await database.refreshTokenSave({ token: randomToken(256), uid: user.uid, applicationId: applicationId, scope: scope });
    const tokens: OAuth2Tokens = {
      accessToken: accessToken.token,
      refreshToken: refreshToken.token,
      tokenType: "Bearer"
    };
    return tokens;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

server.addGrant(
  new CodeGrant(async (transaction: OAuth2Transaction<Application, User, any>): Promise<string> => {
    const code: string = randomToken(256);
    const scope = parseAuthScope(transaction.info?.scope);
    if (!scope || !scope.length) {
      throw new Error(`Invalid scope: ${transaction.info?.scope}`);
    }
    await database.authorizationCodesSave({
      code: code,
      applicationId: transaction.client.id,
      redirectUri: transaction.client.redirectUri,
      uid: transaction.user.uid,
      scope: scope
    });
    return code;
  })
);

server.addExchange(
  new CodeExchange(async (application: Application, code, redirectUri): Promise<OAuth2Tokens> => {
    const authorizationCode = await database.authorizationCodesFind({ authorizationCode: code });
    if (!authorizationCode) return null;
    try {
      await database.authorizationCodesRemove({
        authorizationCode: authorizationCode.code
      });
    } catch (error) {
      console.error(error);
    }
    if (application.id !== authorizationCode.applicationId) throw new Error("Application identifiers do not match.");
    if (redirectUri !== authorizationCode.redirectUri) return null;
    if (authorizationCode.creationDate + 1000 * 60 * 2 < Date.now()) {
      throw new Error("Authorization code expired");
    }
    return await issueTokens(application.id, authorizationCode.uid, authorizationCode.scope);
  })
);

export function parseAuthScope(authScope?: string[]): AuthScope[] {
  const scopes: AuthScope[] = [];
  if (authScope) {
    for (const scope of authScope) {
      if (scope in AuthScope) {
        scopes.push(scope as AuthScope);
      } else {
        throw new Error(`Invalid scope: ${scope}`);
      }
    }
  }
  return scopes;
}

export default server;
