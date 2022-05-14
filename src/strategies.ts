import { Application, User } from "database/database-adapter";
import { Request } from "express";
import { DecodedIdToken } from "firebase-admin/lib/auth/token-verifier";
import passport from "passport";
import { Profile as DiscordProfile, Strategy as DiscordStrategy } from "passport-discord";
import { Profile as GoogleProfile, Strategy as GoogleStrategy, VerifyCallback } from "passport-google-oauth20";
import { BasicStrategy } from "passport-http";
import { Strategy as BearerStrategy } from "passport-http-bearer";
import { Strategy as ClientPasswordStrategy } from "passport-oauth2-client-password";
import { v4 as uuidv4 } from "uuid";
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

async function verifyApplication(applicationId: string, applicationSecret: string, done: (error: Error | null, application?: Application) => void) {
  try {
    const application = await database.applicationFindById({ applicationId: applicationId });
    if (!application) return done(null);
    const successful = await database.applicationCheckSecret({ applicationId: applicationId, secret: applicationSecret });
    if (!successful) return done(null);
    return done(null, application);
  } catch (error) {
    done(error as Error);
  }
}

passport.use(new BasicStrategy(verifyApplication));

passport.use(new ClientPasswordStrategy(verifyApplication));

passport.use(
  new BearerStrategy(async (accessToken, done) => {
    try {
      const token = await database.accessTokenFind({ accessToken: accessToken });
      if (!token) return done(null);
      if (token.creationDate + 1000 * 60 * 60 < Date.now()) return done(new Error("Access Token expired"));
      const user = await database.userFindById({ uid: token.uid });
      if (!user) return done(null);
      done(null, user, { scope: ["*"] });
    } catch (error) {
      done(error as Error);
    }
  })
);

const discordScopes = ["identify"];

passport.use(
  new DiscordStrategy(
    {
      clientID: envRequire("DISCORD_CLIENT_ID"),
      clientSecret: envRequire("DISCORD_CLIENT_SECRET"),
      callbackURL: envRequire("DISCORD_CALLBACK_URL"),
      scope: discordScopes,
      passReqToCallback: true
    },
    async (req: Request, accessToken: string, refreshToken: string, profile: DiscordProfile, done) => {
      const username = profile.username + "#" + profile.discriminator;
      const avatar = profile.avatar ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png` : null;
      try {
        let token: DecodedIdToken | null;
        let uid: string;
        if (req.cookies.session && (token = await verifyCookie(req.cookies.session))) {
          uid = token.uid;
        } else {
          const foundProfile = await database.userProviderProfileFindById({ provider: profile.provider, providerId: profile.id });
          if (foundProfile) {
            uid = foundProfile.uid;
          } else {
            uid = await createUser(username, avatar);
          }
        }
        const user = await database.userProviderProfileUpdateOrCreate({
          provider: "discord",
          uid: uid,
          providerId: profile.id,
          username: username,
          avatar: avatar,
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

const googleScopes = ["profile"];

passport.use(
  new GoogleStrategy(
    {
      clientID: envRequire("GOOGLE_CLIENT_ID"),
      clientSecret: envRequire("GOOGLE_CLIENT_SECRET"),
      callbackURL: envRequire("GOOGLE_CALLBACK_URL"),
      passReqToCallback: true,
      scope: googleScopes
    },
    async (req: Request, accessToken: string, refreshToken: string, profile: GoogleProfile, done: VerifyCallback) => {
      const username = profile.username ? profile.username : uuidv4();
      const avatar = profile.photos && profile.photos[0] ? profile.photos[0].value : null;
      try {
        let token: DecodedIdToken | null;
        let uid: string;
        if (req.cookies.session && (token = await verifyCookie(req.cookies.session))) {
          uid = token.uid;
        } else {
          const foundProfile = await database.userProviderProfileFindById({ provider: profile.provider, providerId: profile.id });
          if (foundProfile) {
            uid = foundProfile.uid;
          } else {
            uid = await createUser(username, avatar);
          }
        }
        const user = await database.userProviderProfileUpdateOrCreate({
          provider: "google",
          uid: uid,
          providerId: profile.id,
          username: username,
          avatar: avatar,
          accessToken: accessToken,
          refreshToken: refreshToken ? refreshToken : null
        });
        done(null, { uid: uid });
      } catch (error) {
        done(error as Error);
      }
    }
  )
);
