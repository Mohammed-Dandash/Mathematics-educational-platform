import { auth } from "../../middleware/auth.middleware.js";
import { Router } from "express";
import * as userController from "./user.controller.js";
import * as schema from "./user.schema.js";
import { validation } from "../../middleware/validation.middleware.js";

const router = Router();

router.post(
  "/addAccount",
  auth,
  validation(schema.addAccount),
  userController.addAccount
);

router.post("/login", validation(schema.login), userController.login);

router.get("/profile", auth, userController.profile);
router.get("/profiles", auth, userController.profiles);

router.patch("/profile", auth, userController.updateProfile);

router.delete("/profile/:id", auth, userController.deleteProfile);

router.patch(
  "/forgetCode",
  validation(schema.forgetCode),
  userController.forgetCode
);

router.patch(
  "/resetPassword",
  validation(schema.resetPassword),
  userController.resetPassword
);

router.get("/students", auth, userController.students);
router.get("/student/:id", auth, userController.studentById);

router.get("/logout", auth, userController.logout);

export default router;
