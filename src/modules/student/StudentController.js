import Student from "../../../DB/models/Student.js";
import { Year } from "../../../DB/models/year.js";
import { Lecture } from "../../../DB/models/lecture.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Token } from "../../../DB/models/token.model.js";
import { StudentToken } from "../../../DB/models/tokenstudent.js";
import { Payment } from "../../../DB/models/payment.js";
import { AssignmentSubmission } from "../../../DB/models/assismentResult.js";
import { Branch } from "../../../DB/models/branch.js";
import { Assignment } from "../../../DB/models/assisment.js";
import { Exam } from "../../../DB/models/exam.js";
import { ExamResult } from "../../../DB/models/examResult.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { LectureAccess } from "../../../DB/models/LectureAccess.js";
import bcrypt from "bcryptjs";

export const register = asyncHandler(async (req, res, next) => {
  const {
    name,
    age,
    email,
    password,
    phone_number,
    nationalId,
    parent_phone_number,
    Grade,
  } = req.body;

  if (!password || password.length < 6) {
    return next(
      new Error("Password must be at least 6 characters", { cause: 400 }),
    );
  }

  const passwordHash = await bcrypt.hash(
    password,
    parseInt(process.env.SALT_ROUNDS || 10),
  );

  const student = await Student.create({
    ...req.body,
    password: passwordHash,
  });

  return res.status(201).json({ message: "Student registered", student });
});

// ============ Login (Student one device) ============
import { env as ENV } from "process";

export const login = asyncHandler(async (req, res, next) => {
  const { email, password, deviceId } = req.body;

  if (!email || !password) {
    return next(new Error("email and password are required", { cause: 400 }));
  }

  // جلب الطالب مع password (حتى لو كان select: false)
  const student = await Student.findOne({ email }).select("+password");
  if (!student) {
    return next(new Error("email or password is wrong", { cause: 400 }));
  }

  // التحقق من وجود password
  if (!student.password) {
    return next(new Error("email or password is wrong", { cause: 400 }));
  }

  // مقارنة كلمة المرور
  const ok = await bcrypt.compare(password, student.password);
  if (!ok) {
    return next(new Error("email or password is wrong", { cause: 400 }));
  }

  const JWT_SECRET = ENV.JWT_SECRET || ENV.SECRET_KEY;
  if (!JWT_SECRET) {
    return next(
      new Error("Server misconfigured: JWT_SECRET is missing", { cause: 500 }),
    );
  }

  const ttlDays = Number(ENV.JWT_TTL_DAYS || 7);
  const expiredAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  const token = jwt.sign(
    {
      id: student._id,
      kind: "student",
      exp: Math.floor(expiredAt.getTime() / 1000),
    },
    JWT_SECRET,
  );

  // جهاز واحد: عطّل أي توكنات صالحة قديمة
  await StudentToken.updateMany(
    { student: student._id, isValid: true },
    { $set: { isValid: false } },
  );

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

  return res.status(200).json({
    message: "Login successful",
    student,
    studentCode: student.studentCode,
    token,
  });
});

// ------------------ RESET CODE (زي ما هو) ------------------
export const resetPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const student = await Student.findOne({ email });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const verificationCode = Math.floor(
      10000 + Math.random() * 90000,
    ).toString();
    student.verificationCode = verificationCode;
    student.verificationCodeExpiry = Date.now() + 15 * 60 * 1000;
    await student.save();

    // محاولة إرسال البريد الإلكتروني
    try {
      await student.sendVerificationCodeEmail(verificationCode);
      return res
        .status(200)
        .json({ message: "Verification code sent to email" });
    } catch (emailError) {
      // إذا لم تكن إعدادات البريد موجودة، أرجع الكود مباشرة (للتطوير)
      if (emailError.message.includes("Email configuration is missing")) {
        return res.status(200).json({
          message: "Verification code generated (email not configured)",
          verificationCode: verificationCode, // فقط للتطوير
        });
      }
      // إذا كان هناك خطأ آخر في البريد، أرميه
      throw emailError;
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error resetting password", error: error.message });
  }
};

export const verificationCode = async (req, res) => {
  try {
    const { email, verificationCode } = req.body;
    const student = await Student.findOne({ email });
    if (!student) return res.status(404).json({ message: "Student not found" });

    if (
      student.verificationCode !== verificationCode ||
      Date.now() > student.verificationCodeExpiry
    ) {
      return res
        .status(400)
        .json({ message: "Invalid or expired verification code" });
    }
    await student.save();
    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error resetting password", error: error.message });
  }
};

// ------------------ SET NEW PASSWORD + ابطال التوكينات ------------------
export const setNewPassword = async (req, res) => {
  try {
    const { email, verificationCode, password } = req.body;
    const student = await Student.findOne({ email });
    if (!student) return res.status(404).json({ message: "Student not found" });

    if (
      student.verificationCode !== verificationCode ||
      Date.now() > student.verificationCodeExpiry
    ) {
      return res
        .status(400)
        .json({ message: "Invalid or expired verification code" });
    }

    // عمل hash للباسورد قبل الحفظ
    const passwordHash = await bcrypt.hash(
      password,
      parseInt(process.env.SALT_ROUNDS || 10),
    );
    student.password = passwordHash;
    student.verificationCode = undefined;
    student.verificationCodeExpiry = undefined;
    await student.save();

    // بعد تغيير الباسورد: ابطل كل التوكينات القديمة
    await StudentToken.updateMany(
      { student: student._id, isValid: true },
      { $set: { isValid: false } },
    );

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error resetting password", error: error.message });
  }
};

// ------------------ LOGOUT (ابطال توكنات الطالب) ------------------
export const logout = async (req, res) => {
  try {
    const student = req.student; // لازم studentAuth قبلها
    if (!student) return res.status(404).json({ message: "Student not found" });

    await StudentToken.updateMany(
      { student: student._id, isValid: true },
      { $set: { isValid: false } },
    );
    // لو عايز تلغي بس التوكن الحالي:
    // await StudentToken.updateOne({ token: req.token }, { $set: { isValid: false } });

    res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error logging out", error: error.message });
  }
};
export const listYears = asyncHandler(async (req, res, next) => {
  const yearsDocs = await Year.find().sort({ order: 1, createdAt: 1 }).lean();
  const years = yearsDocs.map((y) => ({
    id: y._id,
    name: y.name,
    order: y.order ?? null,
  }));

  // ترتيب السنوات بناءً على الاسم
  const getYearOrder = (name) => {
    if (name.includes("أولى")) return 1;
    if (name.includes("تانية") || name.includes("ثانية")) return 2;
    if (name.includes("تالتة") || name.includes("ثالثة")) return 3;
    return 999; // أي أسماء أخرى في النهاية
  };

  years.sort((a, b) => {
    // إذا كان order موجود، استخدمه
    if (a.order !== null && b.order !== null) {
      return a.order - b.order;
    }
    if (a.order !== null) return -1;
    if (b.order !== null) return 1;
    // إذا كان order null، رتب بناءً على الاسم
    return getYearOrder(a.name) - getYearOrder(b.name);
  });

  return res.status(200).json(years);
});

export const getLectureByBranceID = asyncHandler(async (req, res, next) => {
  const { branchId } = req.params;
  const { search } = req.query;

  if (!mongoose.Types.ObjectId.isValid(branchId)) {
    return next(new Error("Invalid branchId", { cause: 400 }));
  }

  const branchExists = await Branch.exists({ _id: branchId });
  if (!branchExists) {
    return next(new Error("Branch not found", { cause: 404 }));
  }

  // بناء query الشرط (استثناء المحاضرات المقفلة)
  const query = { branch: branchId, isLocked: { $ne: true } };

  // إذا كان هناك بحث، أضف شرط البحث
  if (search && search.trim()) {
    query.$or = [
      { title: { $regex: search.trim(), $options: "i" } },
      { description: { $regex: search.trim(), $options: "i" } },
    ];
  }

  const lectures = await Lecture.find(query)
    .select("-videos")
    .sort({ order: 1, createdAt: 1 })
    .lean();

  return res.status(200).json(lectures);
});

export const listLectureTitles = asyncHandler(async (req, res, next) => {
  const { branchId } = req.query;

  if (!branchId) {
    return next(new Error("branchId is required", { cause: 400 }));
  }

  if (!mongoose.Types.ObjectId.isValid(branchId)) {
    return next(new Error("Invalid branchId", { cause: 400 }));
  }

  const branchExists = await Branch.exists({ _id: branchId });
  if (!branchExists) {
    return next(new Error("Branch not found", { cause: 404 }));
  }

  const lectures = await Lecture.find({
    branch: branchId,
    isLocked: { $ne: true },
  })
    .select("-videos")
    .sort({ createdAt: 1 })
    .lean();

  return res.status(200).json(lectures);
});

export const getLectureForStudent = asyncHandler(async (req, res, next) => {
  // لازم الراوت ده يكون وراه studentAuth
  const rawStudentId = req.student?._id || req.student?.id;
  const { id: rawLectureId } = req.params;

  if (!rawStudentId)
    return next(new Error("Unauthorized (student missing)", { cause: 401 }));
  if (!rawLectureId)
    return next(new Error("lecture id is required", { cause: 400 }));

  // حوّل لـ ObjectId علشان الماتش يبقى دقيق
  const sid = new mongoose.Types.ObjectId(String(rawStudentId));
  const lid = new mongoose.Types.ObjectId(String(rawLectureId));

  // هات بيانات المحاضرة
  const lec = await Lecture.findById(lid).select("-videos").lean();
  if (!lec) return next(new Error("Lecture not found", { cause: 404 }));

  // المحاضرة مقفولة - الطالب لا يستطيع رؤيتها
  if (lec.isLocked) {
    return res.status(403).json({
      message: "هذه المحاضرة غير متاحة حالياً",
      isLocked: true,
    });
  }

  // آخر عملية دفع لنفس الطالب والمحاضرة
  const lastPayment = await Payment.findOne({ studentId: sid, lectureId: lid })
    .sort({ createdAt: -1 })
    .lean();

  // التحقق من وجود LectureAccess (منح يدوي من الأدمن)
  const lectureAccess = await LectureAccess.findOne({
    studentId: sid,
    lectureId: lid,
  }).lean();

  // 🔎 التحقق من وجود واجب مسلَّم لهذه المحاضرة من هذا الطالب
  const assignmentSubmission = await AssignmentSubmission.findOne({
    studentId: sid,
    lectureId: lid,
  })
    .sort({ createdAt: -1 })
    .lean();

  // تحديد إذا كان الطالب لديه access
  const hasAccess = lastPayment?.status === "approved" || !!lectureAccess;

  const response = {
    id: lec._id,
    title: lec.title,
    price: lec.price,
    order: lec.order,
    img: lec.img,
    description: lec.description,
    hasAccess: hasAccess,
    // معلومات الواجب (لو موجود)
    assignment: assignmentSubmission
      ? {
          hasSubmitted: true,
          file: assignmentSubmission.file || null,
          submittedAt:
            assignmentSubmission.submittedAt || assignmentSubmission.createdAt,
          assignmentId: assignmentSubmission._id,
        }
      : {
          hasSubmitted: false,
        },
  };

  if (hasAccess) {
    response.paymentStatus =
      lastPayment?.status === "approved" ? "approved" : "granted";
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

// import path from "path";

export const submitAssignmentImages = asyncHandler(async (req, res, next) => {
  const studentId = req.student?.id;
  const { lectureId } = req.params;

  if (!studentId) return next(new Error("Unauthorized", { cause: 401 }));
  if (!lectureId)
    return next(new Error("lectureId is required", { cause: 400 }));

  const lecture = await Lecture.findById(lectureId, { title: 1 }).lean();
  if (!lecture) return next(new Error("Lecture not found", { cause: 404 }));

  // حالياً الواجب يتم رفعه كملف PDF واحد فقط
  if (!req.files || req.files.length === 0) {
    return next(new Error("يرجى رفع ملف PDF واحد على الأقل", { cause: 400 }));
  }

  // نتعامل مع أول ملف فقط (ملف PDF واحد)
  const uploadedFile = req.files[0];
  const idx = uploadedFile.path.indexOf("uploads");
  const filePath =
    idx !== -1 ? uploadedFile.path.slice(idx) : uploadedFile.path;

  const sub = await AssignmentSubmission.create({
    studentId,
    lectureId,
    file: filePath, // ملف PDF واحد
  });

  const student = await Student.findById(studentId, { name: 1 }).lean();

  return res.status(201).json({
    message: "تم استلام الواجب بنجاح",
    studentName: student?.name || null,
    lectureId,
    lectureTitle: lecture.title,
    file: sub.file,
    createdAt: sub.createdAt,
  });
});

import { StudentTokenMobile } from "../../../DB/models/studentToken.js";
export const loginMobile = asyncHandler(async (req, res, next) => {
  const { email, password, deviceId } = req.body;
  if (!email || !password || !deviceId) {
    return next(
      new Error("email, password, and deviceId are required", { cause: 400 }),
    );
  }

  const student = await Student.findOne({ email }).select("+password");
  if (!student)
    return next(new Error("email or password is wrong", { cause: 400 }));

  const ok = await bcrypt.compare(password, student.password);
  if (!ok) return next(new Error("email or password is wrong", { cause: 400 }));

  const JWT_SECRET = process.env.JWT_SECRET || process.env.SECRET_KEY;
  const ttlDays = Number(process.env.JWT_TTL_DAYS || 7);
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
    {
      id: student._id,
      kind: "student",
      deviceId,
      exp: Math.floor(expiredAt.getTime() / 1000),
    },
    JWT_SECRET,
  );

  // عطّل أي توكنات سابقة للجهاز نفسه
  await StudentTokenMobile.updateMany(
    { student: student._id, isValid: true },
    { $set: { isValid: false } },
  );

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

export const grantLectureAccessByCode = asyncHandler(async (req, res, next) => {
  const { studentCode, lectureId } = req.body;

  const student = await Student.findOne({ studentCode });
  if (!student) {
    return next(new Error("Student not found", { cause: 404 }));
  }

  // التحقق من وجود الوصول الحالي
  const existingAccess = await LectureAccess.findOne({
    studentId: student._id,
    lectureId,
  });

  if (existingAccess) {
    // إذا كان الوصول موجود، احذفه (أغلق المحاضرة)
    await LectureAccess.deleteOne({
      studentId: student._id,
      lectureId,
    });

    return res.status(200).json({
      message: "Lecture access revoked successfully",
      action: "closed",
    });
  } else {
    // إذا لم يكن موجود، أنشئه (افتح المحاضرة)
    await LectureAccess.create({
      studentId: student._id,
      lectureId,
      grantedBy: "admin",
      grantedByUser: req.user._id,
    });

    return res.status(200).json({
      message: "Lecture access granted successfully",
      action: "opened",
    });
  }
});

export const checkStudentLectureAccess = asyncHandler(
  async (req, res, next) => {
    const { studentCode, lectureId } = req.query;

    if (!studentCode || !lectureId) {
      return next(
        new Error("studentCode and lectureId are required", { cause: 400 }),
      );
    }

    // التحقق من صحة lectureId
    if (!mongoose.Types.ObjectId.isValid(lectureId)) {
      return next(new Error("Invalid lectureId", { cause: 400 }));
    }

    // البحث عن الطالب
    const student = await Student.findOne({ studentCode });
    if (!student) {
      return next(new Error("Student not found", { cause: 404 }));
    }

    // التحقق من وجود المحاضرة
    const lecture = await Lecture.findById(lectureId);
    if (!lecture) {
      return next(new Error("Lecture not found", { cause: 404 }));
    }

    const sid = new mongoose.Types.ObjectId(String(student._id));
    const lid = new mongoose.Types.ObjectId(String(lectureId));

    // التحقق من وجود Payment مع status approved
    const approvedPayment = await Payment.findOne({
      studentId: sid,
      lectureId: lid,
      status: "approved",
    }).lean();

    // التحقق من وجود LectureAccess (منح يدوي)
    const lectureAccess = await LectureAccess.findOne({
      studentId: sid,
      lectureId: lid,
    }).lean();

    // تحديد إذا كان الطالب لديه access
    const hasAccess = !!approvedPayment || !!lectureAccess;

    // تحديد نوع الوصول
    let accessType = null;
    if (approvedPayment) {
      accessType = "payment";
    } else if (lectureAccess) {
      accessType = "manual";
    }

    return res.status(200).json({
      studentCode,
      lectureId,
      hasAccess,
      accessType,
      studentName: student.name,
      lectureTitle: lecture.title,
    });
  },
);

export const getExamByLecture = asyncHandler(async (req, res, next) => {
  // لازم الراوت ده يكون وراه studentAuth
  const rawStudentId = req.student?._id || req.student?.id;
  const { lectureId } = req.params;

  if (!rawStudentId) {
    return next(new Error("Unauthorized (student missing)", { cause: 401 }));
  }
  if (!lectureId) {
    return next(new Error("lecture id is required", { cause: 400 }));
  }

  // حوّل لـ ObjectId علشان الماتش يبقى دقيق
  const sid = new mongoose.Types.ObjectId(String(rawStudentId));
  const lid = new mongoose.Types.ObjectId(String(lectureId));

  // التحقق من وجود المحاضرة
  const lecture = await Lecture.findById(lid).lean();
  if (!lecture) {
    return next(new Error("Lecture not found", { cause: 404 }));
  }

  // البحث عن الامتحان الخاص بالمحاضرة
  const exam = await Exam.findOne({ lecture: lid }).lean();
  if (!exam) {
    return res.status(404).json({
      message: "لا يوجد امتحان لهذه المحاضرة",
      hasExam: false,
    });
  }

  // البحث عن نتيجة الامتحان للطالب
  const examResult = await ExamResult.findOne({
    studentId: sid,
    examId: exam._id,
  })
    .sort({ createdAt: -1 })
    .lean();

  // لو الطالب امتحن قبل كده، نرجع النتيجة فقط
  if (examResult) {
    return res.status(200).json({
      hasExam: true,
      hasResult: true,
      examId: exam._id,
      result: {
        score: examResult.score,
        totalQuestions: examResult.totalQuestions,
        percentage:
          examResult.totalQuestions > 0
            ? ((examResult.score / examResult.totalQuestions) * 100).toFixed(2)
            : 0,
        answers: examResult.answers,
        submittedAt: examResult.createdAt,
      },
    });
  }

  // لو لم يُمتحن، نرجع الامتحان بدون الإجابات الصحيحة
  const examQuestions = exam.questions.map((q) => {
    // نخلط الإجابات (الصحيحة + الخاطئة) عشوائياً
    const allAnswers = [q.correctAnswer, ...q.wrongAnswers];
    const shuffledAnswers = allAnswers.sort(() => Math.random() - 0.5);

    return {
      question: q.question,
      img: q.img || null,
      answers: shuffledAnswers,
      // لا نرسل correctAnswer للطالب
    };
  });

  return res.status(200).json({
    hasExam: true,
    hasResult: false,
    examId: exam._id,
    lectureId: lid,
    lectureTitle: lecture.title,
    questions: examQuestions,
    totalQuestions: examQuestions.length,
  });
});

export const getPaidLecturesForStudent = asyncHandler(
  async (req, res, next) => {
    const rawStudentId = req.studentMobile?._id || req.studentMobile?.id;

    if (!rawStudentId) {
      return next(new Error("Unauthorized", { cause: 401 }));
    }

    const sid = new mongoose.Types.ObjectId(String(rawStudentId));

    // 1️⃣ المحاضرات المدفوعة
    const paidLectureIds = await Payment.find({
      studentId: sid,
      status: "approved",
    }).distinct("lectureId");

    // 2️⃣ المحاضرات المضافة يدويًا
    const manualLectureIds = await LectureAccess.find({
      studentId: sid,
    }).distinct("lectureId");

    // 3️⃣ دمج الاتنين بدون تكرار
    const lectureIds = [
      ...new Set([
        ...paidLectureIds.map((id) => id.toString()),
        ...manualLectureIds.map((id) => id.toString()),
      ]),
    ];

    if (!lectureIds.length) {
      return res.status(200).json([]);
    }

    // 4️⃣ جلب بيانات المحاضرات (استثناء المقفولة)
    const lectures = await Lecture.find({
      _id: { $in: lectureIds },
      isLocked: { $ne: true },
    })
      .select("title price order img description videos")
      .lean();

    const data = lectures.map((lec) => ({
      id: lec._id,
      title: lec.title,
      price: lec.price,
      order: lec.order,
      img: lec.img,
      description: lec.description,
      video:
        Array.isArray(lec.videos) && lec.videos.length
          ? { url: lec.videos[0].url }
          : null,
    }));

    return res.status(200).json(data);
  },
);
