import database from "database";
import { Client, User } from "database/database-adapter";
import passport from "passport";
import { BasicStrategy } from "passport-http";
import { Strategy as BearerStrategy } from "passport-http-bearer";
import { Strategy as ClientPasswordStrategy } from "passport-oauth2-client-password";

passport.serializeUser((expressUser, done) => {
  done(null, (expressUser as User).id);
});

passport.deserializeUser((userId: string, done) => {
  database.userFindById({ userId: userId }, (error, user) => done(error, user));
});

function verifyClient(clientId: string, clientSecret: string, done: (error: Error | null, client?: Client) => void) {
  database.clientFindById({ clientId: clientId }, (error, client) => {
    if (error) return done(error);
    if (!client) return done(null);
    database.clientCheckSecret({ clientId: clientId, secret: clientSecret }, (error, successful) => {
      if (error) return done(error);
      if (!successful) return done(null);
      return done(null, client);
    });
  });
}

passport.use(new BasicStrategy(verifyClient));

passport.use(new ClientPasswordStrategy(verifyClient));

passport.use(
  new BearerStrategy((accessToken, done) => {
    database.accessTokenFind({ accessToken: accessToken }, (error, token) => {
      if (error) return done(error);
      if (!token) return done(null);
      database.userFindById({ userId: token.userId }, (error, user) => {
        if (error) return done(error);
        if (!user) return done(null);
        done(null, user, { scope: ["*"] });
      });
    });
  })
);
