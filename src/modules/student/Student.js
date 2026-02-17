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
router.get("/years", Student.listYears);
router.get("/lectures/:branchId", Student.getLectureByBranceID);
router.get("/lectures", studentAuth, Student.listLectureTitles);
router.post("/grant-lecture-access", auth, Student.grantLectureAccessByCode);
router.get("/check-lecture-access", auth, Student.checkStudentLectureAccess);
router.get("/s/lectures/:id", studentAuth, Student.getLectureForStudent);
router.get("/s/lectures/:lectureId/exam", studentAuth, Student.getExamByLecture);
// router.get("/lectures", studentAuthM, Student.listLectureTitles);
router.get("/lec/p", studentAuthMobile, Student.getPaidLecturesForStudent);


router.post(
  "/assignments/:lectureId/submit",
  studentAuth,
  upload.array("files", 10),
  Student.submitAssignmentImages
);
router.post('/login/mobile',Student.loginMobile)

export default router;
