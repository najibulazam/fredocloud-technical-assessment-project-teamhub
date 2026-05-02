import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import * as announcementController from "../controllers/announcements.js";
import { verifyAccessToken } from "../middleware/auth.js";
import { checkPermission } from "../middleware/rbac.js";
import { ApiError } from "../utils/ApiError.js";

const router = Router({ mergeParams: true });

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new ApiError(400, "Validation error", errors.array()));
  }
  return next();
};

router.use(verifyAccessToken);

router.get(
  "/",
  [param("workspaceId").isInt()],
  validate,
  announcementController.listAnnouncements
);

router.post(
  "/",
  checkPermission("create:announcement"),
  [
    param("workspaceId").isInt(),
    body("content").isString().trim().notEmpty(),
    body("isPinned").optional().isBoolean()
  ],
  validate,
  announcementController.createAnnouncement
);

router.put(
  "/:id/pin",
  checkPermission("pin:announcement"),
  [param("workspaceId").isInt(), param("id").isInt()],
  validate,
  announcementController.togglePin
);

router.delete(
  "/:id",
  checkPermission("delete:announcement"),
  [param("workspaceId").isInt(), param("id").isInt()],
  validate,
  announcementController.deleteAnnouncement
);

router.post(
  "/:id/reactions",
  [param("workspaceId").isInt(), param("id").isInt(), body("emoji").isString().trim().notEmpty()],
  validate,
  announcementController.toggleReaction
);

router.post(
  "/:id/comments",
  [param("workspaceId").isInt(), param("id").isInt(), body("content").isString().trim().notEmpty()],
  validate,
  announcementController.addComment
);

export default router;
