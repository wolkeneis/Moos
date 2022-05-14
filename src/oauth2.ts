import crypto from "crypto";
import { Application, User, ApplicationToken } from "database/database-adapter";
import oauth2orize, { DeserializeClientDoneFunction } from "oauth2orize";
import database from "./database";

const server = oauth2orize.createServer();

function randomToken(length: number) {
  return crypto.randomBytes(length).toString("hex");
}

server.serializeClient((application: Application, done) => done(null, application.id));

server.deserializeClient(async (applicationId: string, done: DeserializeClientDoneFunction) => {
  try {
    const application = await database.applicationFindById({ applicationId: applicationId });
    return done(null, application);
  } catch (error) {
    done(error as Error);
  }
});

type Tokens = {
  accessToken: ApplicationToken;
  refreshToken: ApplicationToken;
};

async function issueTokens(applicationId: string, uid: string): Promise<Tokens> {
  const user = await database.userFindById({ uid: uid });
  if (!user) throw new Error("User not found");
  await database.accessTokenRemoveByIds({ uid: user.uid, applicationId: applicationId });
  await database.refreshTokenRemoveByIds({ uid: user.uid, applicationId: applicationId });
  const accessToken = await database.accessTokenSave({ token: randomToken(256), uid: user.uid, applicationId: applicationId });
  const refreshToken = await database.refreshTokenSave({ token: randomToken(256), uid: user.uid, applicationId: applicationId });
  return { accessToken: accessToken, refreshToken: refreshToken };
}

server.grant(
  oauth2orize.grant.code(async (application: Application, redirectUri, user: User, done) => {
    try {
      const code: string = randomToken(256);
      await database.authorizationCodesSave({
        code: code,
        applicationId: application.id,
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
  oauth2orize.grant.token(async (application: Application, user: User, done) => {
    try {
      const tokens = await issueTokens(application.id, user.uid);
      done(null, tokens.accessToken.token, tokens.refreshToken.token);
    } catch (error) {
      done(error as Error);
    }
  })
);

server.exchange(
  oauth2orize.exchange.code(async (application: Application, code, redirectUri, done) => {
    try {
      const authorizationCode = await database.authorizationCodesFind({ authorizationCode: code });
      if (!authorizationCode) return done(new Error("Authorization Code not found"));
      if (application.id !== authorizationCode.applicationId) return done(null, false);
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
      const tokens = await issueTokens(application.id, authorizationCode.uid);
      done(null, tokens.accessToken.token, tokens.refreshToken.token);
    } catch (error) {
      done(error as Error);
    }
  })
);

server.exchange(
  oauth2orize.exchange.refreshToken(async (application: Application, token, scope, done) => {
    try {
      const refreshToken = await database.refreshTokenFind({ refreshToken: token });
      if (!refreshToken) return done(new Error("Refresh Token not found"));
      if (application.id !== refreshToken.applicationId) return done(new Error("Original Token Receiver is not the supplied Application"));
      const tokens = await issueTokens(refreshToken.applicationId, refreshToken.uid);
      done(null, tokens.accessToken.token, tokens.refreshToken.token);
    } catch (error) {
      done(error as Error);
    }
  })
);

export default server;
