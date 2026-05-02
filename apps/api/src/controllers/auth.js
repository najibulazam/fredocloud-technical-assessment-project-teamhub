import bcrypt from "bcryptjs";
import { prisma } from "@team-hub/db";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { signAccessToken, signRefreshToken, verifyToken } from "../utils/jwt.js";

const ACCESS_MINUTES = 15;
const REFRESH_DAYS = 7;
const SALT_ROUNDS = 12;
const isSecureCookie =
  process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true";
const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "strict",
  secure: isSecureCookie
};

async function getSafeUserById(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: {
          workspace: true
        }
      }
    }
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const safeUser = { ...user };
  delete safeUser.password;
  const memberships = safeUser.memberships || [];
  delete safeUser.memberships;
  return {
    ...safeUser,
    workspaceMemberships: memberships
  };
}

async function issueTokens(userId) {
  const accessToken = signAccessToken({ userId });
  const refreshToken = signRefreshToken({ userId });
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt
    }
  });

  return { accessToken, refreshToken };
}

export const register = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, "Email already in use");
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const createdUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name
    }
  });

  const { accessToken, refreshToken } = await issueTokens(createdUser.id);
  const user = await getSafeUserById(createdUser.id);

  res.cookie("accessToken", accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: ACCESS_MINUTES * 60 * 1000
  });
  res.cookie("refreshToken", refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: REFRESH_DAYS * 24 * 60 * 60 * 1000
  });

  res.status(201).json({ user });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const dbUser = await prisma.user.findUnique({ where: { email } });
  const passwordValid = dbUser ? await bcrypt.compare(password, dbUser.password) : false;

  if (!dbUser || !passwordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const existingRefresh = req.cookies?.refreshToken;
  if (existingRefresh) {
    await prisma.refreshToken.deleteMany({ where: { token: existingRefresh } });
  }

  const { accessToken, refreshToken } = await issueTokens(dbUser.id);
  const user = await getSafeUserById(dbUser.id);

  res.cookie("accessToken", accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: ACCESS_MINUTES * 60 * 1000
  });
  res.cookie("refreshToken", refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: REFRESH_DAYS * 24 * 60 * 60 * 1000
  });

  res.json({ user });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (!token) {
    throw new ApiError(401, "Missing refresh token");
  }

  let payload;
  try {
    payload = verifyToken(token, "refresh");
  } catch (error) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const record = await prisma.refreshToken.findUnique({ where: { token } });
  if (!record || record.expiresAt < new Date()) {
    throw new ApiError(401, "Refresh token expired");
  }

  const accessToken = signAccessToken({ userId: payload.userId || record.userId });

  res.cookie("accessToken", accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: ACCESS_MINUTES * 60 * 1000
  });

  res.json({ ok: true });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (token) {
    await prisma.refreshToken.deleteMany({ where: { token } });
  }

  res.clearCookie("accessToken", COOKIE_OPTIONS);
  res.clearCookie("refreshToken", COOKIE_OPTIONS);
  res.json({ ok: true });
});

export const me = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  const user = await getSafeUserById(userId);
  res.json({ user });
});
