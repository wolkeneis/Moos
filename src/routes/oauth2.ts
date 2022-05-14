import { Application, User } from "database/database-adapter";
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
    async (application: Application, user: User, scope, type, areq, done) => {
      if (application.trusted) return done(null, true, null, null);
      try {
        const token = await database.accessTokenFindByIds({ applicationId: application.id, uid: user.uid });
        if (token) return done(null, true, null, null);
        return done(null, false, null, null);
      } catch (error) {
        return done(error as Error, false, null, null);
      }
    }
  ),
  (req, res) => {
    if (!req.oauth2) return res.sendStatus(500);
    res.redirect(
      envRequire("CONTROL_ORIGIN") +
        `/redirect/authorize?transactionId=${encodeURIComponent(req.oauth2.transactionID)}&username=${encodeURIComponent(
          req.oauth2.user.username
        )}&application=${encodeURIComponent(req.oauth2.client.name)}&_csrf=${encodeURIComponent(req.csrfToken())}`
    );
  }
);

router.post("/authorize", ensureLoggedIn("/login"), csrfMiddleware, server.decision());

router.post("/token", passport.authenticate(["basic", "oauth2-client-password"], { session: false }), server.token(), server.errorHandler());

export default router;
