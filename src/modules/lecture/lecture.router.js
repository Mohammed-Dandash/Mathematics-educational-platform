import { Router } from "express";
import { validation } from "../../middleware/validation.middleware.js";
import * as schema from "../lecture/lecture.schema.js";
import * as lectureController from "../lecture/lecture.controller.js";
import { upload } from "../../utils/cloudnairy.js";
import { auth } from "../../middleware/auth.middleware.js";

const router = Router();
router.get("/years", auth, lectureController.years);
router.post(
  "/addLecture",
  auth,
  upload.single("img"),
  validation(schema.addLecture),
  lectureController.addLecture
);

router.patch("/:lectureId/videos", auth, lectureController.addVideo);
router.get("/getAllLecture", auth, lectureController.allLecture);
router.get("/lectures/:yearId", auth, lectureController.lecturesByYear);
router.get("/lecture/:lectureId", auth, lectureController.lecture);

router.delete(
  "/lectures/:lectureId/videos/:videoId",
  auth,
  lectureController.deleteVideo
);

router.delete("/lectures/:lectureId", auth, lectureController.deleteLecture);

export default router;
