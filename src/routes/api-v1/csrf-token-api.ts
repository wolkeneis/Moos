import express, { Router } from "express";
import { csrfMiddleware } from "../../middleware.js";

const router: Router = express.Router();

router.use(csrfMiddleware);

router.get("/", async (req, res) => {
  return res.json({
    _csrf: req.csrfToken()
  });
});

router.post("/", (req, res) => res.sendStatus(204));

export default router;
