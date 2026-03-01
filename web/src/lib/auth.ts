import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET ?? "mdcran-dev-secret";
const COOKIE_NAME = "mdcran_admin_token";

export function signAdminToken(): string {
  if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET must be set in production");
  }
  return jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyAdminToken(token: string): boolean {
  try {
    if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
      return false;
    }
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

export async function getAdminTokenFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const token = await getAdminTokenFromCookies();
  if (!token) return false;
  return verifyAdminToken(token);
}

export const COOKIE_NAME_EXPORT = COOKIE_NAME;
