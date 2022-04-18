import crypto from "crypto";
import database from "database";
import { AuthorizationCode, DatabaseError, User, UserClientToken } from "database/database-adapter";
import oauth2orize, { DeserializeClientDoneFunction } from "oauth2orize";

const server = oauth2orize.createServer();

function randomToken(length: number) {
  return crypto.randomBytes(length).toString("hex");
}

server.serializeClient((client, done) => done(null, client.id));

server.deserializeClient((clientId: string, done: DeserializeClientDoneFunction) => {
  database.clientFindById({ clientId: clientId }, (error, client) => {
    if (error) return done(error);
    return done(null, client);
  });
});

type IssueTokensDoneFunction = (error: DatabaseError, accessToken?: UserClientToken, refreshToken?: UserClientToken) => void;

function issueTokens(clientId: string, userId: string, done: IssueTokensDoneFunction) {
  database.userFindById({ userId: userId }, (error: DatabaseError, user?: User) => {
    if (error || !user) return done(error);
    const accessToken: UserClientToken = { token: randomToken(256), userId: user.id, clientId: clientId };
    const refreshToken: UserClientToken = { token: randomToken(256), userId: user.id, clientId: clientId };
    database.accessTokenSave({ accessToken: accessToken }, (error: DatabaseError) => {
      if (error) return done(error);
      database.refreshTokenSave({ refreshToken: refreshToken }, (error: DatabaseError) => {
        if (error) return done(error);
        return done(null, accessToken, refreshToken);
      });
    });
  });
}

server.grant(
  oauth2orize.grant.code((client, redirectUri, user, done) => {
    const code: string = randomToken(256);
    const authorizationCode: AuthorizationCode = { code: code, clientId: client.id, redirectUri: redirectUri, userId: user.id };
    database.authorizationCodesSave({ authorizationCode: authorizationCode }, (error: DatabaseError) => {
      if (error) return done(error);
      return done(null, code);
    });
  })
);

server.grant(
  oauth2orize.grant.token((client, user, done) => {
    issueTokens(client.id, user.id, (error: DatabaseError, accessToken?: UserClientToken, refreshToken?: UserClientToken): void =>
      done(error, accessToken?.token, refreshToken?.token)
    );
  })
);

server.exchange(
  oauth2orize.exchange.code((client, code, redirectUri, done) => {
    database.authorizationCodesFind({ authorizationCode: code }, (error: DatabaseError, authorizationCode?: AuthorizationCode) => {
      if (error || !authorizationCode) return done(error);
      if (client.id !== authorizationCode.clientId) return done(null, false);
      if (redirectUri !== authorizationCode.redirectUri) return done(null, false);

      issueTokens(client.id, authorizationCode.userId, (error: DatabaseError, accessToken?: UserClientToken, refreshToken?: UserClientToken): void =>
        done(error, accessToken?.token, refreshToken?.token)
      );
    });
  })
);

server.exchange(
  oauth2orize.exchange.refreshToken((client, refreshToken, scope, done) => {
    database.refreshTokenFind({ refreshToken: refreshToken }, (error: DatabaseError, refreshToken?: UserClientToken) => {
      if (error || !refreshToken) return done(error);
      if (client.id !== refreshToken.clientId) return done(new Error("Original Token Receiver is not the supplied Client"));
      issueTokens(
        refreshToken.clientId,
        refreshToken.userId,
        (error: DatabaseError, accessToken?: UserClientToken, refreshToken?: UserClientToken): void => {
          if (error || !accessToken || !refreshToken) return done(error);
          database.accessTokenRemoveByIds({ accessToken: accessToken }, (error: DatabaseError) => {
            if (error) return done(error);
            database.refreshTokenRemoveByIds({ refreshToken: refreshToken }, (error: DatabaseError) => {
              if (error) return done(error);
              done(null, accessToken.token, refreshToken.token);
            });
          });
        }
      );
    });
  })
);

export default server;
