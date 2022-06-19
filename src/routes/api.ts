import express, { Router } from "express";
import applicationApi from "./api-v1/application-api.js";
import csrfTokenApi from "./api-v1/csrf-token-api.js";
import profileApi from "./api-v1/profile-api.js";
import sessionApi from "./api-v1/session-api.js";

const router: Router = express.Router();

const v1: Router = express.Router();

router.use("/v1", v1);

v1.use("/application", applicationApi);
v1.use("/profile", profileApi);
v1.use("/csrf-token", csrfTokenApi);
v1.use("/session", sessionApi);

export default router;
