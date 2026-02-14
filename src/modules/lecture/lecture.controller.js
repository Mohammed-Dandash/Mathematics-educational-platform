import { Lecture } from "../../../DB/models/lecture.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Year } from "../../../DB/models/year.js";
import mongoose from "mongoose";
import { Exam } from "./../../../DB/models/exam.js";
import { StudentProgress } from "./../../../DB/models/studentProgress.js";
import { Branch } from "../../../DB/models/branch.js";

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

  const { title, branch, order, description, price, year } = req.body;

  if (!title || !branch || order === undefined || !year) {
    return next(
      new Error("title و branch و order و year مطلوبين", { cause: 400 })
    );
  }

  // التحقق من صحة year و branch كـ ObjectId
  if (!mongoose.Types.ObjectId.isValid(year)) {
    return next(new Error("year غير صحيح", { cause: 400 }));
  }

  if (!mongoose.Types.ObjectId.isValid(branch)) {
    return next(new Error("branch غير صحيح", { cause: 400 }));
  }

  // التحقق من وجود year و branch في قاعدة البيانات
  const yearExists = await Year.findById(year);
  if (!yearExists) {
    return next(new Error("السنة الدراسية غير موجودة", { cause: 404 }));
  }

  const branchExists = await Branch.findById(branch);
  if (!branchExists) {
    return next(new Error("الفرع غير موجود", { cause: 404 }));
  }

  if (!req.file) {
    return next(new Error("الصورة مطلوبة", { cause: 400 }));
  }

  const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
  const imgUrl = `${BASE_URL}/uploads/lectures_pics/${req.file.filename}`;

  const lecture = await Lecture.create({
    title,
    branch: new mongoose.Types.ObjectId(branch),
    order: Number(order),
    description: description || "",
    price: price ? Number(price) : 0,
    img: imgUrl,
    videos: [],
    year: new mongoose.Types.ObjectId(year),
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

  if (!title || !url) {
    return next(new Error("العنوان و رابط الفيديو مطلوبين", { cause: 400 }));
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


export const lecturesByBranch = asyncHandler(async (req, res, next) => {
  const { branchId } = req.params;
  const user = req.user;

  if (user.role !== "admin" && user.role !== "assistant") {
    return next(new Error("انت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }

  if (!branchId) {
    return next(new Error("Branch ID مطلوب", { cause: 400 }));
  }

  if (!mongoose.Types.ObjectId.isValid(branchId)) {
    return next(new Error("Branch ID غير صالح", { cause: 400 }));
  }

  const lectures = await Lecture.find({ branch: branchId })
    .populate("branch", "name")
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

  const lectures = await Lecture.find().populate("branch", "name");

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

  if (!mongoose.Types.ObjectId.isValid(lectureId)) {
    return next(new Error("Lecture ID غير صالح", { cause: 400 }));
  }

  const lecture = await Lecture.findById(lectureId).populate("branch").populate("year");

  if (!lecture) {
    return next(new Error("المحاضرة غير موجودة", { cause: 404 }));
  }

  res.status(200).json({
    success: true,
    data: lecture,
  });
});

export const updateLecture = asyncHandler(async (req, res, next) => {
  const user = req.user;
  if (user.role !== "admin") {
    return next(new Error("انت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }
  
  const { lectureId } = req.params;
  const { title, branch, order, description, price, year } = req.body;

  if (!lectureId) {
    return next(new Error("Lecture ID مطلوب", { cause: 400 }));
  }
  
  if (!mongoose.Types.ObjectId.isValid(lectureId)) {
    return next(new Error("Lecture ID غير صالح", { cause: 400 }));
  }

  const lecture = await Lecture.findById(lectureId);
  if (!lecture) {
    return next(new Error("المحاضرة غير موجودة", { cause: 404 }));
  }
  if (req.file) {
    const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
    const imgUrl = `${BASE_URL}/uploads/lectures_pics/${req.file.filename}`;
    lecture.img = imgUrl;
  }
  lecture.title = title;
  lecture.branch = branch;
  lecture.order = order;
  lecture.description = description;
  lecture.price = price;
  lecture.year = year;

  await lecture.save();

  res.status(200).json({
    message: "تم تحديث المحاضرة بنجاح",
    lecture,
  });
  });

export const deleteVideo = asyncHandler(async (req, res, next) => {
  const user = req.user;

  if (user.role !== "admin") {
    return next(new Error("انت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }

  const { lectureId, videoId } = req.params;

  if (
    !mongoose.Types.ObjectId.isValid(lectureId) ||
    !mongoose.Types.ObjectId.isValid(videoId)
  ) {
    return next(new Error("ID غير صالح", { cause: 400 }));
  }

  const lecture = await Lecture.findById(lectureId);
  if (!lecture) {
    return next(new Error("المحاضرة غير موجودة", { cause: 404 }));
  }

  const index = lecture.videos.findIndex(
    (v) => v._id.toString() === videoId
  );

  if (index === -1) {
    return next(new Error("الفيديو غير موجود", { cause: 404 }));
  }

  lecture.videos.splice(index, 1);
  await lecture.save();

  res.status(200).json({
    message: "تم حذف الفيديو بنجاح",
  });
});


export const deleteLecture = asyncHandler(async (req, res, next) => {
  const user = req.user;

  if (user.role !== "admin") {
    return next(new Error("انت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }

  const { lectureId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(lectureId)) {
    return next(new Error("Lecture ID غير صالح", { cause: 400 }));
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
    message: "تم حذف المحاضرة وكل ما يتعلق بها بنجاح",
  });
});

