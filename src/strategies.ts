import passport from "passport";
import { Profile, Strategy as DiscordStrategy } from "passport-discord";
import { BasicStrategy } from "passport-http";
import { Strategy as BearerStrategy } from "passport-http-bearer";
import { Strategy as ClientPasswordStrategy } from "passport-oauth2-client-password";
import database from "./database";
import { Client, DatabaseError, User } from "./database/database-adapter";
import { envRequire } from "./environment";
import { Request } from "express";
import { verifyCookie } from "auth";

export const passportMiddleware = passport.initialize();
export const passportSessionMiddleware = passport.session();

passport.serializeUser((user, done) => {
  console.log(user);
  done(null, (user as User).uid);
});

passport.deserializeUser((uid: string, done) => {
  database.userFindById({ uid: uid }, (error, user) => done(error, user));
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
      database.userFindById({ uid: token.uid }, (error, user) => {
        if (error) return done(error);
        if (!user) return done(null);
        done(null, user, { scope: ["*"] });
      });
    });
  })
);

const scopes = ["identify"];

passport.use(
  new DiscordStrategy(
    {
      clientID: envRequire("DISCORD_CLIENT_ID"),
      clientSecret: envRequire("DISCORD_CLIENT_SECRET"),
      callbackURL: envRequire("DISCORD_CALLBACK_URL"),
      scope: scopes,
      passReqToCallback: true
    },
    async (req: Request, accessToken: string, refreshToken: string, profile: Profile, done) => {
      console.log(req, accessToken, refreshToken, profile);
      if (req.cookies.session) {
        verifyCookie(req.cookies.session).then((token) => {
          if (token) {
            database.userProviderProfileUpdateOrCreate(
              {
                provider: "discord",
                uid: token.uid,
                providerId: profile.id,
                username: profile.username + "#" + profile.discriminator,
                avatar: profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : undefined,
                accessToken: accessToken,
                refreshToken: refreshToken
              },
              (error?: DatabaseError, user?: User) => {
                return done(error, user);
              }
            );
          } else {
          }
        });
      } else {
        database.userProviderProfileFindById({providerId: profile.id}, (error, profile?) => {
          if(error) {
            done(error);
          }

        });
      }
    }
  )
);
