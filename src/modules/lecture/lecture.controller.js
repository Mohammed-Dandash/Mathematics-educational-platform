import { Lecture } from "../../../DB/models/lecture.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Year } from "../../../DB/models/year.js";
import mongoose from "mongoose";
import { Exam } from "./../../../DB/models/exam.js";
import { StudentProgress } from "./../../../DB/models/studentProgress.js";

export const years = asyncHandler(async (req, res, next) => {
  const user = req.user;

  if (user.role !== "admin" && user.role !== "assistant") {
    return next(new Error("انت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }

  const years = await Year.find();
  res.status(200).json({
    success: true,
    count: years.length,
    data: years,
  });
});

export const addLecture = asyncHandler(async (req, res, next) => {
  const user = req.user;

  if (user.role !== "admin") {
    return next(new Error("انت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }

  const { title, year, order, description, price } = req.body;

  if (!title || !year || order === undefined) {
    return next(new Error("Title, year and order مطلوب", { cause: 400 }));
  }
  if (!req.file) {
    return next(new Error("الصورة مطلوبة", { cause: 400 }));
  }
  let imgUrl = "";
  if (req.file) {
    const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
    imgUrl = `${BASE_URL}/uploads/lectures_pics/${req.file.filename}`;
  }

  const lecture = await Lecture.create({
    title,
    year,
    order,
    description,
    price,
    img: imgUrl,
    videos: [],
  });

  res.status(201).json({
    message: "تم اضافة المحاضرة بنجاح",
    lecture,
  });
});

export const addVideo = asyncHandler(async (req, res, next) => {
  const user = req.user;
  if (user.role !== "admin") {
    return next(new Error("انت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }

  const { lectureId } = req.params;
  const { title, url } = req.body;

  if (!title) {
    return next(new Error("العنوان مطلوب", { cause: 400 }));
  }
  if (!url) {
    return next(new Error("رابط الفيديو مطلوب", { cause: 400 }));
  }

  const lecture = await Lecture.findById(lectureId);
  if (!lecture) {
    return next(new Error("المحاضرة غير موجودة", { cause: 404 }));
  }

  lecture.videos.push({ title, url });

  await lecture.save();
  res.status(201).json({
    message: "تم اضافة الفيديو بنجاح",
  });
});

export const lecturesByYear = asyncHandler(async (req, res, next) => {
  const { yearId } = req.params;
  const user = req.user;

  if (user.role !== "admin" && user.role !== "assistant") {
    return next(new Error("انت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }

  if (!yearId) {
    return next(new Error("Year ID مطلوب", { cause: 400 }));
  }

  const lectures = await Lecture.find({ year: yearId })
    .populate("year", "name")
    .sort({ order: 1 });

  res.status(200).json({
    success: true,
    count: lectures.length,
    data: lectures,
  });
});

export const allLecture = asyncHandler(async (req, res, next) => {
  const user = req.user;
  if (user.role !== "admin" && user.role !== "assistant") {
    return next(new Error("انت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }

  const lectures = await Lecture.find();
  res.status(200).json({
    success: true,
    count: lectures.length,
    data: lectures,
  });
});

export const lecture = asyncHandler(async (req, res, next) => {
  const user = req.user;
  if (user.role !== "admin" && user.role !== "assistant") {
    return next(new Error("انت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }
  const { lectureId } = req.params;
  if (!lectureId) {
    return next(new Error("Lecture ID مطلوب", { cause: 400 }));
  }

  const lecture = await Lecture.findById(lectureId).populate("year");
  if (!lecture) {
    return next(new Error("المحاضرة غير موجودة", { cause: 404 }));
  }

  res.status(200).json({
    success: true,
    data: lecture,
  });
});

export const deleteVideo = asyncHandler(async (req, res, next) => {
  const user = req.user;
  if (user.role !== "admin") {
    return next(new Error("انت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }

  const { lectureId, videoId } = req.params;

  if (!lectureId || !videoId) {
    return next(new Error("Lecture ID and Video ID مطلوبين", { cause: 400 }));
  }

  if (
    !mongoose.Types.ObjectId.isValid(lectureId) ||
    !mongoose.Types.ObjectId.isValid(videoId)
  ) {
    return next(new Error("طريقة غير صحيحة", { cause: 400 }));
  }

  const lecture = await Lecture.findById(lectureId);
  if (!lecture) {
    return next(new Error("المحاضرة غير موجودة", { cause: 404 }));
  }

  const videoIndex = lecture.videos.findIndex(
    (v) => v._id.toString() === videoId
  );
  if (videoIndex === -1) {
    return next(new Error("الفيديو غير موجود في المحاضرة", { cause: 404 }));
  }

  lecture.videos.splice(videoIndex, 1);

  await lecture.save();

  res.status(200).json({
    message: "تم حذف الفيديو بنجاح",
    lecture,
  });
});

export const deleteLecture = asyncHandler(async (req, res, next) => {
  const user = req.user;
  if (user.role !== "admin") {
    return next(new Error("انت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }

  const { lectureId } = req.params;

  if (!lectureId) {
    return next(new Error("Lecture ID مطلوب", { cause: 400 }));
  }
  if (!mongoose.Types.ObjectId.isValid(lectureId)) {
    return next(new Error("طريقة غير صحيحة", { cause: 400 }));
  }

  const lecture = await Lecture.findById(lectureId);
  if (!lecture) {
    return next(new Error("المحاضرة غير موجودة", { cause: 404 }));
  }

  await Exam.deleteMany({ lecture: lectureId });

  await StudentProgress.deleteMany({ lectureId });

  await Lecture.findByIdAndDelete(lectureId);

  res.status(200).json({
    success: true,
    message: "تم حذف المحاضرة و كل ما يتعلق بها بنجاح",
  });
});
