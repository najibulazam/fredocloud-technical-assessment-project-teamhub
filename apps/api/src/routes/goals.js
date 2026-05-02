import { Router } from "express";
import { body, param, query, validationResult } from "express-validator";
import * as goalController from "../controllers/goals.js";
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
  [param("workspaceId").isInt(), query("status").optional().isString()],
  validate,
  goalController.listGoals
);

router.post(
  "/",
  checkPermission("create:goal"),
  [
    param("workspaceId").isInt(),
    body("title").isString().trim().notEmpty(),
    body("description").optional().isString(),
    body("dueDate").optional().isISO8601(),
    body("status")
      .optional()
      .isIn(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
  ],
  validate,
  goalController.createGoal
);

router.get(
  "/:id",
  [param("workspaceId").isInt(), param("id").isInt()],
  validate,
  goalController.getGoal
);

router.put(
  "/:id",
  checkPermission("update:goal"),
  [
    param("workspaceId").isInt(),
    param("id").isInt(),
    body("title").optional().isString(),
    body("description").optional().isString(),
    body("dueDate").optional().isISO8601(),
    body("status")
      .optional()
      .isIn(["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
  ],
  validate,
  goalController.updateGoal
);

router.delete(
  "/:id",
  checkPermission("delete:goal"),
  [param("workspaceId").isInt(), param("id").isInt()],
  validate,
  goalController.deleteGoal
);

router.get(
  "/:id/feed",
  [
    param("workspaceId").isInt(),
    param("id").isInt(),
    query("page").optional().isInt(),
    query("pageSize").optional().isInt()
  ],
  validate,
  goalController.getGoalFeed
);

router.post(
  "/:id/updates",
  [param("workspaceId").isInt(), param("id").isInt(), body("content").isString().trim().notEmpty()],
  validate,
  goalController.postGoalUpdate
);

export default router;
