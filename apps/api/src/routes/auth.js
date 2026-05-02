import { Router } from "express";
import { body, validationResult } from "express-validator";
import * as authController from "../controllers/auth.js";
import { verifyAccessToken } from "../middleware/auth.js";
import { ApiError } from "../utils/ApiError.js";

const router = Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ApiError(400, "Validation error", errors.array()));
  }
  return next();
};

router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isString().isLength({ min: 8 }),
    body("name").isString().trim().notEmpty()
  ],
  validate,
  authController.register
);

router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").isString()],
  validate,
  authController.login
);

router.post("/refresh", validate, authController.refresh);

router.post("/logout", validate, authController.logout);

router.get("/me", verifyAccessToken, validate, authController.me);

export default router;
