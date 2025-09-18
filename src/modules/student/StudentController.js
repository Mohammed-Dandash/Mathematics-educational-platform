import Student from "../../../DB/models/Student.js";
import {Year} from "../../../DB/models/year.js"
import { Lecture } from "../../../DB/models/lecture.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Token } from "../../../DB/models/token.model.js";
import { StudentToken } from "../../../DB/models/tokenstudent.js";
import { Payment } from "../../../DB/models/payment.js";
import { AssignmentSubmission } from "../../../DB/models/assismentResult.js";
import { Assignment } from "../../../DB/models/assisment.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";
export const register = asyncHandler(async (req, res, next) => {
  const {
    name, age, email, password,
    phone_number, nationalId, parent_phone_number, Grade
  } = req.body;
  const passwordHash = await bcrypt.hash(
      password,
      parseInt(process.env.SALT_ROUNDS)
    );

  const student = await Student.create({
   ...req.body,password:passwordHash
  });

  return res.status(201).json({ message: "Student registered", student });
});

// ============ Login (Student one device) ============
// controllers/student.controller.js
import bcrypt from "bcryptjs"; // استخدم bcryptjs علشان الويندوز


import { env as ENV } from "process";

export const login = asyncHandler(async (req, res, next) => {
  const { email, password, deviceId } = req.body;
  if (!email || !password)
    return next(new Error("email and password are required", { cause: 400 }));

  const student = await Student.findOne({ email }).select("+password");
  if (!student)
    return next(new Error("email or password is wrong", { cause: 400 }));

  const ok = await bcrypt.compare(password, student.password);
  if (!ok)
    return next(new Error("email or password is wrong", { cause: 400 }));

  const JWT_SECRET = ENV.JWT_SECRET || ENV.SECRET_KEY;
  if (!JWT_SECRET)
    return next(new Error("Server misconfigured: JWT_SECRET is missing", { cause: 500 }));

  const ttlDays   = Number(ENV.JWT_TTL_DAYS || 7);
  const expiredAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  const token = jwt.sign(
    { id: student._id, kind: "student", exp: Math.floor(expiredAt.getTime() / 1000) },
    JWT_SECRET
  );

  // جهاز واحد: عطّل أي توكنات صالحة قديمة
  await StudentToken.updateMany({ student: student._id, isValid: true }, { $set: { isValid: false } });

  // خزّن التوكن الجديد
  await StudentToken.create({
    student: student._id,
    token,
    isValid: true,
    expiredAt,
    deviceId: deviceId || null,
    userAgent: req.headers["user-agent"] || null,
    ip: req.ip || req.socket?.remoteAddress || null,
  });

  return res.status(200).json({ message: "Login successful", token });
});

// ------------------ RESET CODE (زي ما هو) ------------------
export const resetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const student = await Student.findOne({ email });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const verificationCode = Math.floor(10000 + Math.random() * 90000).toString();
    student.verificationCode = verificationCode;
    student.verificationCodeExpiry = Date.now() + 15 * 60 * 1000;
    await student.save();

    await student.sendVerificationCodeEmail(verificationCode);
    res.status(200).json({ message: "Verification code sent" });
  } catch (error) {
    res.status(500).json({ message: "Error resetting password", error: error.message });
  }
};

export const verificationCode = async (req, res) => {
  try {
    const { email, verificationCode } = req.body;
    const student = await Student.findOne({ email });
    if (!student) return res.status(404).json({ message: "Student not found" });

    if (student.verificationCode !== verificationCode || Date.now() > student.verificationCodeExpiry) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }
    await student.save();
    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: "Error resetting password", error: error.message });
  }
};

// ------------------ SET NEW PASSWORD + ابطال التوكينات ------------------
export const setNewPassword = async (req, res) => {
  try {
    const { email, verificationCode, password } = req.body;
    const student = await Student.findOne({ email });
    if (!student) return res.status(404).json({ message: "Student not found" });

    if (student.verificationCode !== verificationCode || Date.now() > student.verificationCodeExpiry) {
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    student.password = password; // pre-save hook هيعمل hash
    student.verificationCode = undefined;
    student.verificationCodeExpiry = undefined;
    await student.save();

    // بعد تغيير الباسورد: ابطل كل التوكينات القديمة
    await StudentToken.updateMany({ student: student._id, isValid: true }, { $set: { isValid: false } });

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: "Error resetting password", error: error.message });
  }
};

// ------------------ LOGOUT (ابطال توكنات الطالب) ------------------
export const logout = async (req, res) => {
  try {
    const student = req.student; // لازم studentAuth قبلها
    if (!student) return res.status(404).json({ message: "Student not found" });

    await StudentToken.updateMany({ student: student._id, isValid: true }, { $set: { isValid: false } });
    // لو عايز تلغي بس التوكن الحالي:
    // await StudentToken.updateOne({ token: req.token }, { $set: { isValid: false } });

    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    res.status(500).json({ message: "Error logging out", error: error.message });
  }
}
export const listYears = asyncHandler(async (req, res, next) => {
    console.log("vvv")
      let { token } = req.headers;
console.log(token)
  const yearsDocs = await Year.find().sort({ order: 1, createdAt: 1 }).lean();
  const years = yearsDocs.map(y => ({
    id: y._id,
    name: y.name,
    order: y.order ?? null,
  }));
  return res.status(200).json(years);
});

export const listLectureTitles = asyncHandler(async (req, res, next) => {
  const { yearId } = req.query;

  if (!yearId) {
    return next(new Error("yearId is required", { cause: 400 }));
  }

  const yearExists = await Year.exists({ _id: yearId });
  if (!yearExists) {
    return next(new Error("Year not found", { cause: 404 }));
  }

  const lectures = await Lecture.find({ year: yearId })
    .sort({  createdAt: 1 })
    .lean();



  return res.status(200).json(lectures);
});

export const getLectureForStudent = asyncHandler(async (req, res, next) => {
  // لازم الراوت ده يكون وراه studentAuth
  const rawStudentId  = req.student?._id || req.student?.id;
  const { id: rawLectureId } = req.params;

  if (!rawStudentId)  return next(new Error("Unauthorized (student missing)", { cause: 401 }));
  if (!rawLectureId)  return next(new Error("lecture id is required", { cause: 400 }));

  // حوّل لـ ObjectId علشان الماتش يبقى دقيق
  const sid = new mongoose.Types.ObjectId(String(rawStudentId));
  const lid = new mongoose.Types.ObjectId(String(rawLectureId));

  // هات بيانات المحاضرة
  const lec = await Lecture.findById(lid).lean();
  if (!lec) return next(new Error("Lecture not found", { cause: 404 }));

  // آخر عملية دفع لنفس الطالب والمحاضرة
  const lastPayment = await Payment
    .findOne({ studentId: sid, lectureId: lid })   // 👈 مطابق لسكيمتك
    .sort({ createdAt: -1 })
    .lean();

  const response = {
    id: lec._id,
    title: lec.title,
    price: lec.price,
    order: lec.order,
    price:lec.price,
    img:lec.img,
    description:lec.description
  };
  if (lastPayment?.status === "approved") {
    response.paymentStatus = "approved";
    response.video = Array.isArray(lec.videos) && lec.videos.length
      ? { url: lec.videos[0].url }
      : null;
    return res.status(200).json(response);
  }

  if (lastPayment?.status === "pending") {
    response.paymentStatus = "pending";
    response.message = "تم استلام الإيصال. برجاء انتظار تأكيد الدفع.";
    return res.status(403).json(response);
  }

  if (lastPayment?.status === "rejected") {
    response.paymentStatus = "rejected";
    response.message = "تم رفض إيصال الدفع. برجاء إعادة رفع إيصال صالح.";
    return res.status(403).json(response);
  }

  response.paymentStatus = "none";
  response.message = "بالرجاء الدفع أولًا للوصول إلى محتوى المحاضرة.";
  return res.status(403).json(response);
});

export const submitAssignmentImages = asyncHandler(async (req, res, next) => {
  const studentId = req.student?.id;
  const { lectureId } = req.params;

  if (!studentId)   return next(new Error("Unauthorized", { cause: 401 }));
  if (!lectureId)   return next(new Error("lectureId is required", { cause: 400 }));

  const lecture = await Lecture.findById(lectureId, { title: 1 }).lean();
  if (!lecture)     return next(new Error("Lecture not found", { cause: 404 }));

  if (!req.files || req.files.length === 0) {
    return next(new Error("At least one image is required", { cause: 400 }));
  }

  const images = req.files.map((f) => f.path);

  const sub = await AssignmentSubmission.create({
    studentId,
    lectureId,
    images,
    status: "submitted",
  });

  const student = await Student.findById(studentId, { name: 1 }).lean();

  return res.status(201).json({
    message: "تم استلام الواجب بنجاح",
    studentName: student?.name || null,
    lectureId,
    lectureTitle: lecture.title,
    imagesCount: images.length,
    status: sub.status, 
    createdAt: sub.createdAt,
  });
});

import { StudentTokenMobile } from "../../../DB/models/studentToken.js";
export const loginMobile = asyncHandler(async (req, res, next) => {
  const { email, password, deviceId } = req.body;
  if (!email || !password || !deviceId) {
    return next(new Error("email, password, and deviceId are required", { cause: 400 }));
  }

  const student = await Student.findOne({ email }).select("+password");
  if (!student) return next(new Error("email or password is wrong", { cause: 400 }));

  const ok = await bcrypt.compare(password, student.password);
  if (!ok) return next(new Error("email or password is wrong", { cause: 400 }));

  const JWT_SECRET = process.env.JWT_SECRET || process.env.SECRET_KEY;
  const ttlDays   = Number(process.env.JWT_TTL_DAYS || 7);
  const expiredAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  // شيّك هل عنده جهاز مسجّل بالفعل
  const existingToken = await StudentTokenMobile.findOne({
    student: student._id,
    isValid: true,
  });

  if (existingToken && existingToken.deviceId !== deviceId) {
    return next(new Error("هذا الحساب مربوط بجهاز آخر", { cause: 403 }));
  }

  // لو كل حاجة تمام، أنشئ التوكن
  const token = jwt.sign(
    { id: student._id, kind: "student", deviceId, exp: Math.floor(expiredAt.getTime() / 1000) },
    JWT_SECRET
  );

  // عطّل أي توكنات سابقة للجهاز نفسه
  await StudentTokenMobile.updateMany({ student: student._id, isValid: true }, { $set: { isValid: false } });

  await StudentTokenMobile.create({
    student: student._id,
    token,
    deviceId,
    userAgent: req.headers["user-agent"] || null,
    ip: req.ip || req.socket?.remoteAddress || null,
    expiredAt,
  });

  res.status(200).json({ message: "Login successful", token });
});
