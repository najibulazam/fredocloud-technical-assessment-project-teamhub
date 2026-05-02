import { Router } from "express";
import { param, validationResult } from "express-validator";
import * as analyticsController from "../controllers/analytics.js";
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

router.get("/stats", [param("workspaceId").isInt()], validate, analyticsController.getStats);

router.get("/chart", [param("workspaceId").isInt()], validate, analyticsController.getChart);

router.get(
  "/export",
  checkPermission("export:data"),
  [param("workspaceId").isInt()],
  validate,
  analyticsController.exportWorkspace
);

export default router;
