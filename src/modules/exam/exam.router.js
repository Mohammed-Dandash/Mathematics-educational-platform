import { Router } from "express";
import { auth } from "../../middleware/auth.middleware.js";
import { validation } from "../../middleware/validation.middleware.js";
import * as examController from "../exam/exam.controller.js";
import * as schema from "../exam/exam.schema.js";
import { upload } from "../../utils/cloudnairy.js";
import { studentAuth } from "../../middleware/authstudent.js";

const router = Router();

router.post(
  "/addExam/:lectureId",
  auth,
  upload.array("imgs"),
  // validation(schema.addExam),
  examController.addExam
);

router.get("/exams/:lectureId", examController.examsByLecture);

router.post(
  "/submit",
  studentAuth,
  validation(schema.submitExam),
  examController.submitExam
);

export default router;
