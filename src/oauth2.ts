import crypto from "crypto";
import database from "./database";
import { AuthorizationCode, Client, User, UserClientToken } from "./database/database-adapter";
import oauth2orize, { DeserializeClientDoneFunction } from "oauth2orize";

const server = oauth2orize.createServer();

function randomToken(length: number) {
  return crypto.randomBytes(length).toString("hex");
}

server.serializeClient((client: Client, done) => done(null, client.id));

server.deserializeClient((clientId: string, done: DeserializeClientDoneFunction) => {
  database
    .clientFindById({ clientId: clientId })
    .then((client) => {
      return done(null, client);
    })
    .catch(done);
});

type IssueTokensDoneFunction = (error: Error | null, accessToken?: UserClientToken, refreshToken?: UserClientToken) => void;

function issueTokens(clientId: string, uid: string, done: IssueTokensDoneFunction) {
  database
    .userFindById({ uid: uid })
    .then((user) => {
      const accessToken: UserClientToken = { token: randomToken(256), uid: user.uid, clientId: clientId };
      const refreshToken: UserClientToken = { token: randomToken(256), uid: user.uid, clientId: clientId };
      database
        .accessTokenSave({ accessToken: accessToken })
        .then(() => {
          database
            .refreshTokenSave({ refreshToken: refreshToken })
            .then(() => {
              return done(null, accessToken, refreshToken);
            })
            .catch(done);
        })
        .catch(done);
      if (!user) return done(new Error("User not found"));
    })
    .catch(done);
}

server.grant(
  oauth2orize.grant.code((client: Client, redirectUri, user: User, done) => {
    const code: string = randomToken(256);
    const authorizationCode: AuthorizationCode = { code: code, clientId: client.id, redirectUri: redirectUri, uid: user.uid };
    database
      .authorizationCodesSave({ authorizationCode: authorizationCode })
      .then(() => {
        return done(null, code);
      })
      .catch(done);
  })
);

server.grant(
  oauth2orize.grant.token((client: Client, user: User, done) => {
    issueTokens(client.id, user.uid, (error, accessToken, refreshToken): void => done(error, accessToken?.token, refreshToken?.token));
  })
);

server.exchange(
  oauth2orize.exchange.code((client: Client, code, redirectUri, done) => {
    database
      .authorizationCodesFind({ authorizationCode: code })
      .then((authorizationCode) => {
        if (!authorizationCode) return done(new Error("Authorization Code not found"));
        if (client.id !== authorizationCode.clientId) return done(null, false);
        if (redirectUri !== authorizationCode.redirectUri) return done(null, false);
        issueTokens(client.id, authorizationCode.uid, (error, accessToken, refreshToken): void =>
          done(error, accessToken?.token, refreshToken?.token)
        );
      })
      .catch(done);
  })
);

server.exchange(
  oauth2orize.exchange.refreshToken((client: Client, refreshToken, scope, done) => {
    database
      .refreshTokenFind({ refreshToken: refreshToken })
      .then((refreshToken) => {
        if (!refreshToken) return done(new Error("Refresh Token not found"));
        if (client.id !== refreshToken.clientId) return done(new Error("Original Token Receiver is not the supplied Client"));
        issueTokens(refreshToken.clientId, refreshToken.uid, (error, accessToken, refreshToken): void => {
          if (error || !accessToken || !refreshToken) return done(error);
          database
            .accessTokenRemoveByIds({ accessToken: accessToken })
            .then(() => {
              database
                .refreshTokenRemoveByIds({ refreshToken: refreshToken })
                .then(() => {
                  done(null, accessToken.token, refreshToken.token);
                })
                .catch(done);
            })
            .catch(done);
        });
      })
      .catch(done);
  })
);

export default server;
