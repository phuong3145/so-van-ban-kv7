import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { RoleType } from "./constants";
import { findUserById, UserDTO } from "./store";

const JWT_SECRET_KEY =
  process.env.JWT_SECRET || "so_van_ban_kv7_secret_key_change_in_production_2026";
const encodedSecret = new TextEncoder().encode(JWT_SECRET_KEY);

export const COOKIE_NAME = "svb_session_token";

export interface SessionPayload {
  userId: string;
  username: string;
  role: RoleType;
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedSecret);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedSecret);
    if (!payload || typeof payload.userId !== "string") return null;
    return {
      userId: payload.userId,
      username: String(payload.username || ""),
      role: payload.role as RoleType,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<UserDTO | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload) return null;

    const user = await findUserById(payload.userId);
    if (!user || !user.isActive) return null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...userDto } = user;
    return userDto;
  } catch {
    return null;
  }
}
