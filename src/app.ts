import cors from "cors";
import express from "express";
import "./environment";
import { env } from "./environment";
import { oauth2, login } from "./routes";
import { sessionMiddleware } from "./session";
import { passportMiddleware, passportSessionMiddleware } from "./strategies";
import cookieParser from "cookie-parser";

const app = express();

app.set("trust proxy", 1);

const whitelist = [env("CONTROL_ORIGIN") ?? "https://wolkeneis.dev", env("CONTROL_ORIGIN_2") ?? "https://www.wolkeneis.dev"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || whitelist.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS: " + origin));
      }
    },
    allowedHeaders: "X-Requested-With, Content-Type",
    credentials: true
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(sessionMiddleware);
app.use(passportMiddleware);
app.use(passportSessionMiddleware);

app.use("/oauth2", oauth2);
app.use("/login", login);

app.get("/", (req, res) => {
  res.sendStatus(200);
});

export const server = app.listen(env("PORT") || 4000);

export default app;
