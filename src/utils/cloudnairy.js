// import multer from "multer";
// import path from "path";
// import fs from "fs";

// const lecturesVideosPath = path.join(
//   process.cwd(),
//   "uploads",
//   "lectures_videos"
// );
// const examsPicsPath = path.join(process.cwd(), "uploads", "exams_pics");

// [lecturesVideosPath, examsPicsPath].forEach((dir) => {
//   if (!fs.existsSync(dir)) {
//     fs.mkdirSync(dir, { recursive: true });
//   }
// });

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     if (file.mimetype.startsWith("video/")) {
//       cb(null, lecturesVideosPath);
//     } else if (file.mimetype.startsWith("image/")) {
//       cb(null, examsPicsPath);
//     } else {
//       cb(new Error("File type not allowed"), false);
//     }
//   },
//   filename: (req, file, cb) => {
//     cb(null, `${Date.now()}-${file.originalname}`);
//   },
// });

// const fileFilter = (req, file, cb) => {
//   const allowed = [
//     "image/jpeg",
//     "image/png",
//     "image/gif",
//     "image/webp",
//     "video/mp4",
//     "video/mov",
//     "video/avi",
//     "video/mkv",
//   ];
//   if (allowed.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error("File type not allowed"), false);
//   }
// };

// export const upload = multer({
//   storage,
//   fileFilter,
//   limits: { fileSize: 1024 * 1024 * 1024 * 10 },
// });

import multer from "multer";
import path from "path";
import fs from "fs";

// 🗂️ مسارات التخزين
const lecturesVideosPath = path.join(
  process.cwd(),
  "uploads",
  "lectures_videos"
);
const examsPicsPath = path.join(process.cwd(), "uploads", "exams_pics");
const receiptsPath = path.join(process.cwd(), "uploads", "receipts");
const assignmentsPicsPath = path.join(
  process.cwd(),
  "uploads",
  "assignments_pics"
);
const lecturesPicsPath = path.join(process.cwd(), "uploads", "lectures_pics");

// ✅ تأكد من إنشاء الفولدرات لو مش موجودة
[
  lecturesVideosPath,
  examsPicsPath,
  receiptsPath,
  assignmentsPicsPath,
  lecturesPicsPath,
].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const url = req.originalUrl || req.baseUrl || "";

    // 🎥 فيديوهات المحاضرات
    if (file.mimetype.startsWith("video/")) {
      return cb(null, lecturesVideosPath);
    }

    // 📄 PDF (للوجبات)
    if (file.mimetype === "application/pdf" && url.includes("assignments")) {
      return cb(null, assignmentsPicsPath);
    }

    // 🖼️ صور
    if (file.mimetype.startsWith("image/")) {
      if (url.includes("assignments")) return cb(null, assignmentsPicsPath); // واجبات
      if (url.includes("exams")) return cb(null, examsPicsPath); // امتحانات
      if (url.includes("payments")) return cb(null, receiptsPath); // إيصالات
      if (url.includes("lecture")) return cb(null, lecturesPicsPath);
      return cb(null, examsPicsPath); // default
    }

    return cb(new Error("الفايل غير مسموح به"), false);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// 🛡️ الفلاتر (أنواع الفايلات المسموح بها)
const fileFilter = (req, file, cb) => {
  const allowed = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "video/mp4",
    "video/mov",
    "video/avi",
    "video/mkv",
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("الفايل غير مسموح به"), false);
};

export const upload = multer({
  storage,
  fileFilter,
});
