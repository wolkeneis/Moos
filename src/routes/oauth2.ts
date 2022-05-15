import { Application, AuthScope, User } from "../database/database-adapter";
import express, { Router } from "express";
import passport from "passport";
import database from "../database";
import { envRequire } from "../environment";
import { csrfMiddleware, ensureLoggedIn, sessionMiddleware } from "../middleware";
import server from "../oauth2";

const router: Router = express.Router();

router.use(sessionMiddleware);

router.get(
  "/authorize",
  ensureLoggedIn("/login"),
  csrfMiddleware,
  server.authorization(
    async (applicationId, redirectUri, done) => {
      try {
        const application = await database.applicationFindById({ applicationId: applicationId });
        if (!application) return done(new Error("Application not found"));
        if (application.redirectUri === redirectUri) {
          return done(null, application, redirectUri);
        } else {
          return done(new Error("Redirect URIs do not match"));
        }
      } catch (error) {
        return done(error as Error);
      }
    },
    async (application: Application, user: User, scopes, _type, _areq, done) => {
      for (const scope of scopes) {
        if (!(scope in AuthScope)) {
          return done(new Error(`Invalid scope: ${scope}`), false, null, null);
        }
      }
      if (application.trusted) return done(null, true, { scope: scopes }, null);
      try {
        const token = await database.accessTokenFindByIds({ applicationId: application.id, uid: user.uid });
        if (token) return done(null, true, { scope: token.scope }, null);
        return done(null, false, { scope: scopes }, null);
      } catch (error) {
        return done(error as Error, false, null, null);
      }
    }
  ),
  (req, res) => {
    if (!req.oauth2) return res.sendStatus(500);
    res.redirect(
      envRequire("CONTROL_ORIGIN") +
        `/redirect/authorize?transactionId=${encodeURIComponent(req.oauth2.transactionID)}&redirectUri=${encodeURIComponent(
          req.oauth2.redirectURI
        )}&application=${encodeURIComponent(req.oauth2.client.name)}&scope=${req.oauth2.info.scope}&_csrf=${encodeURIComponent(req.csrfToken())}`
    );
  }
);

router.post("/authorize", ensureLoggedIn("/login"), csrfMiddleware, server.decision());

router.post("/token", passport.authenticate(["basic", "oauth2-client-password"], { session: false }), server.token(), server.errorHandler());

export default router;
