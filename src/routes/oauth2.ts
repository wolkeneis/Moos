import { ensureLoggedIn } from "connect-ensure-login";
import { Client, DatabaseError, User, UserClientToken } from "../database/database-adapter";
import express, { Router } from "express";
import passport from "passport";
import database from "../database";
import server from "../oauth2";
import { envRequire } from "../environment";

const router: Router = express.Router();

router.get(
  "/authorize",
  ensureLoggedIn("/login"),
  server.authorization(
    (clientId, redirectUri, done) => {
      database.clientFindById({ clientId: clientId }, (error: DatabaseError, client?: Client) => {
        if (error || !client) return done(error);
        if (client.redirectUri === redirectUri) {
          return done(null, client, redirectUri);
        } else {
          return done(new Error("Redirect URIs do not match"));
        }
      });
    },
    (client: Client, user: User, scope, type, areq, done) => {
      if (client.trusted) return done(null, true, null, null);
      database.accessTokenFindByIds({ clientId: client.id, uid: user.uid }, (error: DatabaseError, token?: UserClientToken) => {
        if (error) return done(error, false, null, null);
        if (token) return done(null, true, null, null);
        return done(null, false, null, null);
      });
    }
  ),
  (req, res) => {
    if (!req.oauth2) return res.sendStatus(500);
    res.redirect(
      envRequire("CONTROL_ORIGIN") +
        `/redirect/authorize?transactionId=${encodeURIComponent(req.oauth2.transactionID)}&username=${encodeURIComponent(
          req.oauth2.user.username
        )}&client=${encodeURIComponent(req.oauth2.client.name)}`
    );
  }
);

router.post("/authorize", ensureLoggedIn("/login"), server.decision());

router.post("/token", passport.authenticate(["basic", "oauth2-client-password"], { session: false }), server.token(), server.errorHandler());

export default router;
