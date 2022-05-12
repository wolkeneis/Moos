import crypto from "crypto";
import { Client, User, UserClientToken } from "database/database-adapter";
import oauth2orize, { DeserializeClientDoneFunction } from "oauth2orize";
import database from "./database";

const server = oauth2orize.createServer();

function randomToken(length: number) {
  return crypto.randomBytes(length).toString("hex");
}

server.serializeClient((client: Client, done) => done(null, client.id));

server.deserializeClient(async (clientId: string, done: DeserializeClientDoneFunction) => {
  try {
    const client = await database.clientFindById({ clientId: clientId });
    return done(null, client);
  } catch (error) {
    done(error as Error);
  }
});

type Tokens = {
  accessToken: UserClientToken;
  refreshToken: UserClientToken;
};

async function issueTokens(clientId: string, uid: string): Promise<Tokens> {
  const user = await database.userFindById({ uid: uid });
  if (!user) throw new Error("User not found");
  await database.accessTokenRemoveByIds({ uid: user.uid, clientId: clientId });
  await database.refreshTokenRemoveByIds({ uid: user.uid, clientId: clientId });
  const accessToken = await database.accessTokenSave({ token: randomToken(256), uid: user.uid, clientId: clientId });
  const refreshToken = await database.refreshTokenSave({ token: randomToken(256), uid: user.uid, clientId: clientId });
  return { accessToken: accessToken, refreshToken: refreshToken };
}

server.grant(
  oauth2orize.grant.code(async (client: Client, redirectUri, user: User, done) => {
    try {
      const code: string = randomToken(256);
      await database.authorizationCodesSave({
        code: code,
        clientId: client.id,
        redirectUri: redirectUri,
        uid: user.uid
      });
      done(null, code);
    } catch (error) {
      done(error as Error);
    }
  })
);

server.grant(
  oauth2orize.grant.token(async (client: Client, user: User, done) => {
    try {
      const tokens = await issueTokens(client.id, user.uid);
      done(null, tokens.accessToken.token, tokens.refreshToken.token);
    } catch (error) {
      done(error as Error);
    }
  })
);

server.exchange(
  oauth2orize.exchange.code(async (client: Client, code, redirectUri, done) => {
    try {
      const authorizationCode = await database.authorizationCodesFind({ authorizationCode: code });
      if (!authorizationCode) return done(new Error("Authorization Code not found"));
      if (client.id !== authorizationCode.clientId) return done(null, false);
      if (redirectUri !== authorizationCode.redirectUri) return done(null, false);
      if (authorizationCode.creationDate + 1000 * 60 * 2 < Date.now()) {
        try {
          await database.authorizationCodesRemove({
            authorizationCode: code
          });
        } catch (error) {
          console.error(error);
        }
        done(new Error("Authorization Code expired"));
      }
      const tokens = await issueTokens(client.id, authorizationCode.uid);
      done(null, tokens.accessToken.token, tokens.refreshToken.token);
    } catch (error) {
      done(error as Error);
    }
  })
);

server.exchange(
  oauth2orize.exchange.refreshToken(async (client: Client, token, scope, done) => {
    try {
      const refreshToken = await database.refreshTokenFind({ refreshToken: token });
      if (!refreshToken) return done(new Error("Refresh Token not found"));
      if (client.id !== refreshToken.clientId) return done(new Error("Original Token Receiver is not the supplied Client"));
      const tokens = await issueTokens(refreshToken.clientId, refreshToken.uid);
      done(null, tokens.accessToken.token, tokens.refreshToken.token);
    } catch (error) {
      done(error as Error);
    }
  })
);

export default server;
