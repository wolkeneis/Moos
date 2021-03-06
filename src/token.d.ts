import type { DecodedIdToken } from "firebase-admin/lib/auth/token-verifier";

declare global {
  namespace Express {
    export interface Request {
      token: DecodedIdToken | null;
    }
  }
}
