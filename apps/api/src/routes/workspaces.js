import { Router } from "express";
import { body, param, query, validationResult } from "express-validator";
import * as workspaceController from "../controllers/workspaces.js";
import { verifyAccessToken } from "../middleware/auth.js";
import { checkPermission } from "../middleware/rbac.js";
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

router.get("/", validate, workspaceController.listWorkspaces);
router.get("/discover", validate, workspaceController.discoverWorkspaces);

router.post(
  "/",
  [
    body("name").isString().trim().notEmpty(),
    body("description").optional().isString(),
    body("accentColor").optional().isString()
  ],
  validate,
  workspaceController.createWorkspace
);

router.get(
  "/:id/permissions",
  [param("id").isInt()],
  validate,
  workspaceController.getWorkspacePermissions
);

router.get("/:id", [param("id").isInt()], validate, workspaceController.getWorkspace);

router.put(
  "/:id",
  checkPermission("update:workspace"),
  [
    param("id").isInt(),
    body("name").optional().isString(),
    body("description").optional().isString(),
    body("accentColor").optional().isString()
  ],
  validate,
  workspaceController.updateWorkspace
);

router.post(
  "/:id/invite",
  checkPermission("invite:member"),
  [param("id").isInt(), body("email").isEmail().normalizeEmail()],
  validate,
  workspaceController.createInvite
);

router.post(
  "/:id/invite/accept",
  [param("id").isInt(), body("token").isString().notEmpty()],
  validate,
  workspaceController.acceptInvite
);

router.post(
  "/:id/join-requests",
  [param("id").isInt()],
  validate,
  workspaceController.requestJoinWorkspace
);

router.get(
  "/:id/join-requests",
  checkPermission("invite:member"),
  [param("id").isInt(), query("status").optional().isIn(["ALL", "PENDING"])],
  validate,
  workspaceController.listJoinRequests
);

router.post(
  "/:id/join-requests/:requestId/approve",
  checkPermission("invite:member"),
  [param("id").isInt(), param("requestId").isInt()],
  validate,
  workspaceController.approveJoinRequest
);

router.delete(
  "/:id/members/:userId",
  checkPermission("remove:member"),
  [param("id").isInt(), param("userId").isInt()],
  validate,
  workspaceController.removeMember
);

router.put(
  "/:id/members/:userId/role",
  checkPermission("assign:role"),
  [
    param("id").isInt(),
    param("userId").isInt(),
    body("role").isIn(["ADMIN", "MEMBER"])
  ],
  validate,
  workspaceController.updateMemberRole
);

export default router;
