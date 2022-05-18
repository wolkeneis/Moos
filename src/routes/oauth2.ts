import { OAuth2Info, OAuth2Transaction } from "@wolkeneis/oauth2-server";
import express, { Router } from "express";
import passport from "passport";
import database from "../database";
import { Application, User } from "../database/database-adapter";
import { envRequire } from "../environment";
import { csrfMiddleware, ensureLoggedIn, sessionMiddleware } from "../middleware";
import server, { parseAuthScope } from "../oauth2";

const router: Router = express.Router();

router.use(sessionMiddleware);

router.get(
  "/authorize",
  ensureLoggedIn("/login"),
  csrfMiddleware,
  server.authorization(
    async (request): Promise<Application> => {
      const application = await database.applicationFindById({ applicationId: request.clientId });
      if (!application) throw new Error("Application not found");
      if (application.redirectUri !== request.redirectUri) throw new Error("Redirect URIs do not match");
      return application;
    },
    async (transaction: OAuth2Transaction<Application, User, unknown>): Promise<OAuth2Info> => {
      const scope = parseAuthScope(transaction.info?.scope);
      if (!scope || !scope.length) {
        throw new Error(`Invalid scope: ${transaction.info?.scope}`);
      }
      return { allow: transaction.client.trusted, scope: scope };
    }
  ),
  (req, res) => {
    if (!req.oauth2) return res.sendStatus(500);
    res.redirect(
      envRequire("CONTROL_ORIGIN") +
        `/redirect/authorize?transactionId=${encodeURIComponent(req.oauth2.transactionId)}&redirectUri=${encodeURIComponent(
          req.oauth2.redirectUri
        )}&application=${encodeURIComponent(req.oauth2.client.name)}&scope=${req.oauth2.info!.scope}&_csrf=${encodeURIComponent(req.csrfToken())}`
    );
  }
);

router.post("/authorize", ensureLoggedIn("/login"), csrfMiddleware, server.transaction(), server.decision());

router.post("/token", passport.authenticate(["basic", "oauth2-client-password"], { session: false }), server.token());

export default router;
