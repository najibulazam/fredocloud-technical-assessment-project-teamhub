import { Router } from "express";
import { body, param, query, validationResult } from "express-validator";
import * as actionItemController from "../controllers/actionItems.js";
import { verifyAccessToken } from "../middleware/auth.js";
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
  [
    param("workspaceId").isInt(),
    query("status").optional().isIn(["TODO", "IN_PROGRESS", "DONE"]),
    query("assigneeId").optional().isInt(),
    query("priority").optional().isIn(["LOW", "MEDIUM", "HIGH", "URGENT"])
  ],
  validate,
  actionItemController.listActionItems
);

router.post(
  "/",
  [
    param("workspaceId").isInt(),
    body("title").isString().trim().notEmpty(),
    body("assigneeId").optional().isInt(),
    body("goalId").optional().isInt(),
    body("priority").optional().isIn(["LOW", "MEDIUM", "HIGH", "URGENT"]),
    body("status").optional().isIn(["TODO", "IN_PROGRESS", "DONE"]),
    body("dueDate").optional().isISO8601()
  ],
  validate,
  actionItemController.createActionItem
);

router.put(
  "/:id",
  [
    param("workspaceId").isInt(),
    param("id").isInt(),
    body("title").optional().isString(),
    body("assigneeId").optional().isInt(),
    body("goalId").optional().isInt(),
    body("priority").optional().isIn(["LOW", "MEDIUM", "HIGH", "URGENT"]),
    body("status").optional().isIn(["TODO", "IN_PROGRESS", "DONE"]),
    body("dueDate").optional().isISO8601()
  ],
  validate,
  actionItemController.updateActionItem
);

router.delete(
  "/:id",
  [param("workspaceId").isInt(), param("id").isInt()],
  validate,
  actionItemController.deleteActionItem
);

export default router;
