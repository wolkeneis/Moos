import express, { Router } from "express";
import { csrfMiddleware } from "middleware";

const router: Router = express.Router();

router.post("/request", async (req, res) => {
  res.json({
    _csrf: req.csrfToken()
  });
});

router.post("/try", csrfMiddleware, (req, res) => res.sendStatus(204));

export default router;
