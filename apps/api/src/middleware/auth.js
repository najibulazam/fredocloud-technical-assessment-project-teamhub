import { verifyToken } from "../utils/jwt.js";
import { ApiError } from "../utils/ApiError.js";

export function verifyAccessToken(req, res, next) {
  const token = req.cookies?.accessToken;

  if (!token) {
    return next(new ApiError(401, "Missing access token"));
  }

  try {
    const payload = verifyToken(token, "access");
    req.user = {
      ...payload,
      id: payload.userId || payload.id
    };
    return next();
  } catch (error) {
    return next(new ApiError(401, "Invalid access token"));
  }
}
