import jwt from "jsonwebtoken";
import { env } from "../config.js";

/*
 * What remains of the retired phone sign-in.
 *
 * requestOtp() and verifyOtp() were deleted on 6 Aug 2026 along with their
 * routes. Together they were a second, unguarded way to obtain a session: no
 * Google, no SMS (sendSms had sent nothing since MSG91 was dropped), and in
 * development the code came back in the response body — so two HTTP requests
 * signed you in as any phone number you cared to name. Verified against the
 * running server before deletion.
 *
 * Deleting the routes alone would not have been enough. A token-minting
 * function sitting in the tree is one careless import away from being a live
 * door again, so the functions went too.
 *
 * verifyJwt() stays: it is what validates the sessions Google sign-in issues,
 * and it only ever READS a token.
 */

export function verifyJwt(token: string): { uid: string; phone: string } | null {
  try {
    return jwt.verify(token, env.JWT_SECRET) as { uid: string; phone: string };
  } catch {
    return null;
  }
}
