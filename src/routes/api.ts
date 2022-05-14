import express, { Router } from "express";
import applicationApi from "./api-v1/application-api";
import csrfTokenApi from "./api-v1/csrf-token-api";
import profileApi from "./api-v1/profile-api";
import sessionApi from "./api-v1/session-api";

const router: Router = express.Router();

const v1: Router = express.Router();

router.use("/v1", v1);

v1.use("/application", applicationApi);
v1.use("/profile", profileApi);
v1.use("/csrf-token", csrfTokenApi);
v1.use("/session", sessionApi);

export default router;
