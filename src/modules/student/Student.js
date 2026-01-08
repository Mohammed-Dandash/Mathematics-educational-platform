import express from "express";
import * as Student from "./StudentController.js";
import { auth } from "../../middleware/auth.middleware.js";
import { upload } from "../../utils/cloudnairy.js";
import { studentAuth } from "../../middleware/authstudent.js";
import { studentAuthMobile } from "../../middleware/authMobile.js";
const router = express.Router();

router.post("/login", Student.login);
router.delete("/logout", studentAuth, Student.logout);
router.post("/register", Student.register);
router.post("/reset-password", Student.resetPassword);
router.post("/verification-code", Student.verificationCode);
router.post("/set-new-password", Student.setNewPassword);
router.get("/years", studentAuth, Student.listYears);

router.get("/lectures", studentAuth, Student.listLectureTitles);

router.get("/s/lectures/:id", studentAuth, Student.getLectureForStudent);
// router.get("/lectures", studentAuthM, Student.listLectureTitles);
router.get("/lec/p", studentAuthMobile, Student.getPaidLecturesForStudent);


router.post(
  "/assignments/:lectureId/submit",
  studentAuth,
  upload.array("images", 30),
  Student.submitAssignmentImages
);
router.post('/login/mobile',Student.loginMobile)

export default router;
