import { Client, User } from "database/database-adapter";
import express, { Router } from "express";
import passport from "passport";
import database from "../database";
import { envRequire } from "../environment";
import { csrfMiddleware, ensureLoggedIn } from "../middleware";
import server from "../oauth2";

const router: Router = express.Router();

router.get(
  "/authorize",
  ensureLoggedIn("/redirect/login"),
  csrfMiddleware,
  server.authorization(
    async (clientId, redirectUri, done) => {
      try {
        const client = await database.clientFindById({ clientId: clientId });
        if (!client) return done(new Error("Client not found"));
        if (client.redirectUri === redirectUri) {
          return done(null, client, redirectUri);
        } else {
          return done(new Error("Redirect URIs do not match"));
        }
      } catch (error) {
        done(error as Error);
      }
    },
    async (client: Client, user: User, scope, type, areq, done) => {
      if (client.trusted) return done(null, true, null, null);
      try {
        const token = await database.accessTokenFindByIds({ clientId: client.id, uid: user.uid });
        if (token) return done(null, true, null, null);
        return done(null, false, null, null);
      } catch (error) {
        done(error as Error, false, null, null);
      }
    }
  ),
  (req, res) => {
    if (!req.oauth2) return res.sendStatus(500);
    res.redirect(
      envRequire("CONTROL_ORIGIN") +
        `/redirect/authorize?transactionId=${encodeURIComponent(req.oauth2.transactionID)}&username=${encodeURIComponent(
          req.oauth2.user.username
        )}&client=${encodeURIComponent(req.oauth2.client.name)}&_csrf=${encodeURIComponent(req.csrfToken())}`
    );
  }
);

router.post("/authorize", ensureLoggedIn("/login"), csrfMiddleware, server.decision());

router.post("/token", passport.authenticate(["basic", "oauth2-client-password"], { session: false }), server.token(), server.errorHandler());

export default router;
