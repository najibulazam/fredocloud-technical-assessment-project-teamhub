import { Router } from "express";
import { body, validationResult } from "express-validator";
import * as userController from "../controllers/users.js";
import { verifyAccessToken } from "../middleware/auth.js";
import { uploadSingle } from "../middleware/upload.js";
import { ApiError } from "../utils/ApiError.js";

const router = Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ApiError(400, "Validation error", errors.array()));
  }
  return next();
};

router.use(verifyAccessToken);

router.put(
  "/profile",
  [body("name").isString().trim().notEmpty()],
  validate,
  userController.updateProfile
);

router.put("/avatar", uploadSingle("avatar"), validate, userController.uploadAvatar);

router.get("/notifications", validate, userController.listNotifications);

router.put("/notifications/read", validate, userController.markNotificationsRead);

export default router;
