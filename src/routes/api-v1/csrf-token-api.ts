import express, { Router } from "express";
import { doubleCsrfUtilities } from "../../middleware.js";

const router: Router = express.Router();

router.use(doubleCsrfUtilities.doubleCsrfProtection);

router.get("/", async (req, res) => {
  return res.json({
    _csrf: doubleCsrfUtilities.generateToken(res, req)
  });
});

router.post("/", (req, res) => res.sendStatus(204));

export default router;
