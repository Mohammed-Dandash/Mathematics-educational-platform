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

// 🗂️ مجلدات رئيسية
const basePath = path.join(process.cwd(), "uploads");

const paths = {
  lecturesVideos: path.join(basePath, "lectures_videos"),
  examsPics: path.join(basePath, "exams_pics"),
  receipts: path.join(basePath, "receipts"),
  assignmentsPics: path.join(basePath, "assignments_pics"),
  lecturesPics: path.join(basePath, "lectures_pics"),
};

// ✅ إنشاء الفولدرات
Object.values(paths).forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// 📂 التخزين
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const url = req.originalUrl || "";

    if (file.mimetype.startsWith("video/")) {
      return cb(null, paths.lecturesVideos);
    }

    if (file.mimetype.startsWith("image/")) {
      if (url.includes("assignments")) return cb(null, paths.assignmentsPics);
      if (url.includes("exams")) return cb(null, paths.examsPics);
      if (url.includes("payments")) return cb(null, paths.receipts);
      if (url.includes("lecture")) return cb(null, paths.lecturesPics);
      return cb(null, paths.examsPics); // default
    }

    cb(new Error("❌ الفايل غير مسموح به"), false);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// ✅ الفلتر
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
  else cb(new Error("❌ الفايل غير مسموح به"), false);
};

export const upload = multer({ storage, fileFilter });
