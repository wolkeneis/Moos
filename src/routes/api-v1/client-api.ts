import express, { Router } from "express";
import passport from "passport";

const router: Router = express.Router();

router.use(passport.authenticate("bearer", { session: false }));

export default router;
