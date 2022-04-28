import passport from "passport";
import { Profile, Strategy as DiscordStrategy } from "passport-discord";
import { BasicStrategy } from "passport-http";
import { Strategy as BearerStrategy } from "passport-http-bearer";
import { Strategy as ClientPasswordStrategy } from "passport-oauth2-client-password";
import database from "./database";
import { Client, User } from "./database/database-adapter";
import { envRequire } from "./environment";
import { Request } from "express";
import { createUser, verifyCookie } from "./auth";

export const passportMiddleware = passport.initialize();
export const passportSessionMiddleware = passport.session();

passport.serializeUser((user, done) => {
  console.log(user);
  done(null, (user as User).uid);
});

passport.deserializeUser((uid: string, done) => {
  database.userFindById({uid: uid}).then((user) => done(null, user)).catch(done);
});

function verifyClient(clientId: string, clientSecret: string, done: (error: Error | null, client?: Client) => void) {
  database.clientFindById({clientId: clientId}).then((client) => {
    if (!client) return done(null);
    database.clientCheckSecret({ clientId: clientId, secret: clientSecret }).then((successful) => {
      if (!successful) return done(null);
    }).catch(done);
  }).catch(done);
}

passport.use(new BasicStrategy(verifyClient));

passport.use(new ClientPasswordStrategy(verifyClient));

passport.use(
  new BearerStrategy((accessToken, done) => {
    database.accessTokenFind({accessToken: accessToken}).then((token) => {
      if (!token) return done(null);
      database.userFindById({uid: token.uid}).then((user) => {
        if (!user) return done(null);
        done(null, user, { scope: ["*"] });
      }).catch(done);
    }).catch(done);
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
            database
              .userProviderProfileUpdateOrCreate({
                provider: "discord",
                uid: token.uid,
                providerId: profile.id,
                username: profile.username + "#" + profile.discriminator,
                avatar: profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : undefined,
                accessToken: accessToken,
                refreshToken: refreshToken
              })
              .then((user) => done(null, {uid: user.uid}))
              .catch(done);
          } else {
          }
        });
      } else {
        database
          .userProviderProfileFindById({ provider: profile.provider, providerId: profile.id })
          .then((foundProfile) => {
            if (foundProfile) {
            database
              .userProviderProfileUpdateOrCreate({
                provider: "discord",
                uid: foundProfile.uid,
                providerId: profile.id,
                username: profile.username + "#" + profile.discriminator,
                avatar: profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : undefined,
                accessToken: accessToken,
                refreshToken: refreshToken
              })
              .then((user) => done(null, {uid: user.uid}))
              .catch(done);
            } else {
              createUser(
                profile.username + "#" + profile.discriminator,
                profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : undefined
              ).then((uid) => {
                done(null, {uid: uid});
              }).catch(done);
            }
          })
          .catch(done);
      }
    }
  )
);
