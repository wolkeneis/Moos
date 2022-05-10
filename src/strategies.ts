import { Client, User } from "database/database-adapter";
import { Request } from "express";
import passport from "passport";
import { Profile, Strategy as DiscordStrategy } from "passport-discord";
import { BasicStrategy } from "passport-http";
import { Strategy as BearerStrategy } from "passport-http-bearer";
import { Strategy as ClientPasswordStrategy } from "passport-oauth2-client-password";
import { createUser, verifyCookie } from "./auth";
import database from "./database";
import { envRequire } from "./environment";

passport.serializeUser((user, done) => {
  done(null, (user as User).uid);
});

passport.deserializeUser(async (uid: string, done) => {
  try {
    const user = await database.userFindById({ uid: uid });
    done(null, user);
  } catch (error) {
    done(error as Error);
  }
});

async function verifyClient(clientId: string, clientSecret: string, done: (error: Error | null, client?: Client) => void) {
  try {
    const client = await database.clientFindById({ clientId: clientId });
    if (!client) return done(null);
    const successful = await database.clientCheckSecret({ clientId: clientId, secret: clientSecret });
    if (!successful) return done(null);
    return done(null, client);
  } catch (error) {
    done(error as Error);
  }
}

passport.use(new BasicStrategy(verifyClient));

passport.use(new ClientPasswordStrategy(verifyClient));

passport.use(
  new BearerStrategy(async (accessToken, done) => {
    try {
      const token = await database.accessTokenFind({ accessToken: accessToken });
      if (!token) return done(null);
      if (token.creationDate + 1000 * 60 * 60) return done(new Error("Access Token expired"));
      const user = await database.userFindById({ uid: token.uid });
      if (!user) return done(null);
      done(null, user, { scope: ["*"] });
    } catch (error) {
      done(error as Error);
    }
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
      try {
        const token = await verifyCookie(req.cookies.session);
        let uid: string;
        if (token) {
          uid = token.uid;
        } else {
          const foundProfile = await database.userProviderProfileFindById({ provider: profile.provider, providerId: profile.id });
          if (foundProfile) {
            uid = foundProfile.uid;
          } else {
            uid = await createUser(
              profile.username + "#" + profile.discriminator,
              profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : null
            );
          }
        }
        const user = await database.userProviderProfileUpdateOrCreate({
          provider: "discord",
          uid: uid,
          providerId: profile.id,
          username: profile.username + "#" + profile.discriminator,
          avatar: profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : null,
          accessToken: accessToken,
          refreshToken: refreshToken
        });
        done(null, { uid: user.uid });
      } catch (error) {
        done(error as Error);
      }
    }
  )
);
