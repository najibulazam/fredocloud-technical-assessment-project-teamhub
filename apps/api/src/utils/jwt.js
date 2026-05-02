import jwt from "jsonwebtoken";

const accessSecret = process.env.JWT_ACCESS_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;
const accessExpires = process.env.JWT_ACCESS_EXPIRES || "15m";
const refreshExpires = process.env.JWT_REFRESH_EXPIRES || "7d";

if (!accessSecret || !refreshSecret) {
  throw new Error("JWT secrets are not configured");
}

export function signAccessToken(payload) {
  return jwt.sign(payload, accessSecret, { expiresIn: accessExpires });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, refreshSecret, { expiresIn: refreshExpires });
}

export function verifyToken(token, type = "access") {
  const secret = type === "refresh" ? refreshSecret : accessSecret;
  return jwt.verify(token, secret);
}
