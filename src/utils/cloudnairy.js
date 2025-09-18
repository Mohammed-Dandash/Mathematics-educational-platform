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
    cb(null, "/tmp"); // ✅ writable on Vercel
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
// 🛡️ الفلاتر (أنواع الفايلات المسموح بها)
const fileFilter = (req, file, cb) => {
  const allowed = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
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
