// src/middleware/studentAuth.middleware.js
import { asyncHandler } from "../utils/asyncHandler.js";
import jsonwebtoken from "jsonwebtoken";
import { StudentToken } from "../../DB/models/tokenstudent.js"; // عدّل المسار لو مختلف
import  Student  from "../../DB/models/Student.js";          // عدّل المسار لو مختلف

export const studentAuth = asyncHandler(async (req, res, next) => {
  // 1) هيدر التوكين: token: Bearer <jwt>
  let header = req.headers["token"];
  if (!header || !header.startsWith(process.env.BEARER_TOKEN)) {
    return next(new Error("No token provided", { cause: 401 }));
  }

  // 2) استخرج الـ JWT
  const raw = header.split(" ")[1];

  // 3) verify
  let decoded;
  try {
    decoded = jsonwebtoken.verify(raw, process.env.SECRET_KEY);
  } catch (err) {
    return next(new Error("Invalid token", { cause: 401 }));
  }

  // 4) وجود التوكين في DB (StudentToken)
  const tokenDb = await StudentToken.findOne({ token: raw });
  if (!tokenDb) {
    return next(new Error("Token not found in database", { cause: 401 }));
  }

  // (اختياري) لو عندك حقول isValid/expiredAt في StudentToken وعايز تشيك عليها:
  // if (tokenDb.isValid === false) return next(new Error("Token is invalidated", { cause: 401 }));
  // if (tokenDb.expiredAt && tokenDb.expiredAt <= new Date()) {
  //   return next(new Error("Token expired", { cause: 401 }));
  // }

  // 5) هات الطالب
  const student = await Student.findById(decoded.id);
  if (!student) {
    return next(new Error("Student not found", { cause: 404 }));
  }

  // 6) ثبّت على الريكوست
  req.student = student;  // استخدمها في الراوتات الخاصة بالطالب
  req.token = raw;
  next();
});
