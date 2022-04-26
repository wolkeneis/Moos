import { DecodedIdToken } from "firebase-admin/lib/auth/token-verifier";
import { auth } from "./firebase";
import database from "./database";

export async function createUser(username: string, avatar?: string): Promise<string | null> {
  return new Promise<string | null>(async (resolve, reject) => {
  try {
    const user = await auth.createUser({
      disabled: false,
      displayName: username,
      emailVerified: false,
      photoURL: avatar
    });
    database.userCreate(
      {
        avatar: avatar,
        scopes: [],
        uid: user.uid,
        username: username
      },
      (error) => {
        if (error) {
          return reject();
        }
        return resolve(user.uid);
      }
    );
  } catch (error) {
    return reject(error);
  }
  });
}

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
