import crypto from "crypto";
import oauth2orize, { DeserializeClientDoneFunction } from "oauth2orize";
import database from "./database";
import { Client, User, UserClientToken } from "./database/database-adapter";

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
      database
        .accessTokenSave({ token: randomToken(256), uid: user.uid, clientId: clientId })
        .then((accessToken) => {
          database
            .refreshTokenSave({ token: randomToken(256), uid: user.uid, clientId: clientId })
            .then((refreshToken) => {
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
    database
      .authorizationCodesSave({
        code: code,
        clientId: client.id,
        redirectUri: redirectUri,
        uid: user.uid
      })
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
        if (authorizationCode.creationDate + 1000 * 60 * 2 < Date.now()) {
          return database
            .authorizationCodesRemove({
              authorizationCode: code
            })
            .catch(() => null)
            .then(() => done(new Error("Authorization Code expired")));
        }
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
