import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import * as milestoneController from "../controllers/milestones.js";
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

router.post(
  "/",
  [
    param("goalId").isInt(),
    body("title").isString().trim().notEmpty(),
    body("progress").optional().isInt({ min: 0, max: 100 })
  ],
  validate,
  milestoneController.createMilestone
);

router.put(
  "/:id",
  [
    param("goalId").isInt(),
    param("id").isInt(),
    body("title").optional().isString(),
    body("progress").optional().isInt({ min: 0, max: 100 })
  ],
  validate,
  milestoneController.updateMilestone
);

router.delete(
  "/:id",
  [param("goalId").isInt(), param("id").isInt()],
  validate,
  milestoneController.deleteMilestone
);

export default router;
