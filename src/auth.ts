import { DecodedIdToken } from "firebase-admin/lib/auth/token-verifier";
import database from "./database/index.js";
import { auth } from "./firebase.js";

export function verifyCookie(cookie: string): Promise<DecodedIdToken | null> {
  return auth.verifySessionCookie(cookie, true).catch(() => null);
}

export function createCookie(token: string): Promise<string> {
  return auth.createSessionCookie(token, {
    expiresIn: 604800000
  });
}

export function createToken(uid: string): Promise<string> {
  return auth.createCustomToken(uid);
}

export function verifyToken(token: string): Promise<DecodedIdToken | null> {
  return auth.verifyIdToken(token).catch(() => null);
}

export async function createUser(username: string, avatar: string | null): Promise<string> {
  const user = await auth.createUser({
    disabled: false,
    displayName: username,
    emailVerified: false,
    photoURL: avatar
  });
  await database.userCreate({
    avatar: avatar,
    scopes: [],
    uid: user.uid,
    username: username,
    private: false
  });
  return user.uid;
}
