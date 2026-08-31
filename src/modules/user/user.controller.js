import { asyncHandler } from "../../utils/asyncHandler.js";
import { User } from "../../../DB/models/user.model.js";
import { Token } from "../../../DB/models/token.model.js";
import { sendEmail } from "../../utils/sendEmail.js";
import { resetPasswordTemplate } from "../../utils/resetPasswordTemplate.js";
import randomstring from "randomstring";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import Students from "../../../DB/models/Student.js";
import { ExamResult } from "../../../DB/models/examResult.js";
import { StudentProgress } from "../../../DB/models/studentProgress.js";
import { AssignmentSubmission } from "../../../DB/models/assismentResult.js";
import { Lecture } from "../../../DB/models/lecture.js";
import { Payment } from "../../../DB/models/payment.js";
import { LectureAccess } from "../../../DB/models/LectureAccess.js";
import { ActivationCode } from "../../../DB/models/ActivationCode.js";
import { Center } from "../../../DB/models/center.js";

const CAIRO_TZ = "Africa/Cairo";

const cairoDateKey = (date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const fillDailySeries = (rows, days = 30) => {
  const map = new Map((rows || []).map((r) => [r._id, r]));
  const series = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = cairoDateKey(d);
    const row = map.get(key);
    series.push({
      date: key,
      count: row?.count || 0,
      approved: row?.approved || 0,
      pending: row?.pending || 0,
      rejected: row?.rejected || 0,
    });
  }
  return series;
};

const countByKey = (rows, keys, fallback = 0) => {
  const map = Object.fromEntries((rows || []).map((r) => [r._id, r.count]));
  return keys.reduce((acc, key) => {
    acc[key] = map[key] ?? fallback;
    return acc;
  }, {});
};
export const addAccount = asyncHandler(async (req, res, next) => {
  const user = req.user;
  if (user.role !== "admin") {
    return next(new Error("أنت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }

  const { username, email, role, password } = req.body;

  const passwordHash = await bcrypt.hash(
    password,
    parseInt(process.env.SALT_ROUNDS)
  );

  const newUser = new User({
    username,
    email,
    role,
    password: passwordHash,
  });
  await newUser.save();
  res.status(201).json({ message: "تم انشاء الحساب بنجاح" });
});

export const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return next(new Error("الايميل او كلمة المرور غير صحيح", { cause: 400 }));
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return next(new Error("الايميل او كلمة المرور غير صحيح", { cause: 400 }));
  }
  if (user.role !== "admin" && user.role !== "assistant") {
    return next(new Error("انت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }

  const token = jwt.sign({ id: user._id }, process.env.SECRET_KEY);
  await Token.create({ token, user: user._id });
  await Token.deleteMany({ isValid: false });

  res.status(200).json({ token });
});

export const profile = asyncHandler(async (req, res, next) => {
  const { id } = req.user;

  if (req.user.role !== "admin" && req.user.role !== "assistant") {
    return next(new Error("انت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }
  const user = await User.findById(id);
  if (!user) {
    return next(
      new Error("المستخدم غير موجود", {
        cause: 403,
      })
    );
  }
  res.status(200).json(user);
});

export const profiles = asyncHandler(async (req, res, next) => {
  const users = await User.find();
  if (req.user.role !== "admin" && req.user.role !== "assistant") {
    return next(new Error("انت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }
  if (!users) {
    return next(
      new Error("المستخدم غير موجود", {
        cause: 403,
      })
    );
  }
  res.status(200).json(users);
});

export const updateProfile = asyncHandler(async (req, res, next) => {
  const id = req.body?.id || req.user?.id;
  if (req.user.role !== "admin" && req.user.role !== "assistant") {
    return next(new Error("انت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }

  const user = await User.findById(id);
  if (!user) {
    return next(
      new Error("المستخدم غير موجود", {
        cause: 403,
      })
    );
  }

  const updatedata = {};
  if (req.body?.username) updatedata.username = req.body.username;
  if (req.body?.email) updatedata.email = req.body.email;
  if (req.body?.role) updatedata.role = req.body.role;
  if (req.body?.password) {
    const hashed = await bcrypt.hash(
      req.body.password,
      parseInt(process.env.SALT_ROUNDS)
    );
    updatedata.password = hashed;
  }

  if (Object.keys(updatedata).length === 0) {
    return res.status(400).json({ message: "لا توجد بيانات للتحديث" });
  }
  await User.findByIdAndUpdate(id, updatedata);

  res.status(200).json({ message: "تم تحديث البيانات بنجاح" });
});

export const deleteProfile = asyncHandler(async (req, res, next) => {
  const user = req.user;
  if (user.role !== "admin") {
    return next(new Error("انت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }
  const { id } = req.params;
  const deletedUser = await User.findByIdAndDelete(id);
  if (!deletedUser) {
    return next(
      new Error("المستخدم غير موجود", {
        cause: 403,
      })
    );
  }
  res.status(200).json({ message: "تم حذف المستخدم بنجاح" });
});

export const forgetCode = asyncHandler(async (req, res, next) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return next(new Error("لا يوجد مستخدم بهذا الايميل", { cause: 400 }));
  }
  const code = randomstring.generate({
    length: 6,
    charset: "numeric",
  });
  user.code = code;
  await user.save();
  const messageSent = sendEmail({
    to: email,
    subject: "Reset Password",
    html: resetPasswordTemplate(code),
  });
  if (!messageSent) {
    return next(new Error("لم نتمكن من ارسال الرسالة", { cause: 400 }));
  }
  res.status(200).json({ message: "تم ارسال الكود بنجاح" });
});

export const resetPassword = asyncHandler(async (req, res, next) => {
  const { code, password } = req.body;
  const user = await User.findOne({ code });
  if (!user) {
    return next(new Error("هذا الكود غير صحيح", { cause: 400 }));
  }
  const passwordHash = await bcrypt.hash(
    password,
    parseInt(process.env.SALT_ROUNDS)
  );
  user.password = passwordHash;
  user.code = null;
  await user.save();

  const tokens = await Token.find({ user: user._id });
  tokens.forEach(async (token) => {
    token.isValid = false;
    await token.save();
  });
  res.status(200).json({ message: "تم تغيير كلمة المرور بنجاح" });
});

export const students = asyncHandler(async (req, res, next) => {
  const year = req.query.year;
  const user = req.user;

  if (user.role !== "admin" && user.role !== "assistant") {
    return next(new Error("انت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }

  const allowedYears = ["Frist", "Second", "Third"];
  if (!year || !allowedYears.includes(year)) {
    return next(
      new Error("السنه غير صحيحة يجب ان تكون مثلا: Frist, Second, Third", {
        cause: 400,
      })
    );
  }
  const students = await Students.find({ Grade: year }).select(
    "-__v -tokens -password"
  );
  if (!students || students.length === 0) {
    return next(new Error("لا يوجد طلاب بهذه السنة", { cause: 404 }));
  }
  res.status(200).json(students);
});

export const studentById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  if (user.role !== "admin" && user.role !== "assistant") {
    return next(new Error("انت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }

  const student = await Students.findById(id).select("-__v -tokens -password");
  if (!student) {
    return next(new Error("الطالب غير موجود", { cause: 404 }));
  }
  const examsResults = await ExamResult.find({ studentId: id })
    .select("examId score totalQuestions answers")
    .populate({
      path: "examId",
      select: "lecture",
      populate: {
        path: "lecture",
        select: "title",
      },
    });
    
  const progress = await StudentProgress.find({ studentId: id })
    .select("lectureId homeworkDone examDone")
    .populate({
      path: "lectureId",
      select: "title",
    });

  const assignmentSubmissions = await AssignmentSubmission.find({ studentId: id })
    .select("lectureId file images files submittedAt createdAt updatedAt")
    .populate({
      path: "lectureId",
      select: "title",
    });

  const studentData = { 
    ...student.toObject(), 
    examsResults, 
    progress,
    assignmentSubmissions 
  };
  res.status(200).json(studentData);
});

export const dashboard = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "admin" && req.user.role !== "assistant") {
    return next(new Error("انت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }

  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);
  last30.setHours(0, 0, 0, 0);

  const last7 = new Date();
  last7.setDate(last7.getDate() - 7);
  last7.setHours(0, 0, 0, 0);

  const [
    studentsByGrade,
    studentsLast30,
    lecturesCount,
    lecturesByYear,
    paymentsByStatus,
    paymentsLast30,
    revenueAgg,
    accessByMethod,
    accessLast7,
    codesAgg,
    centersCount,
    examResultsAgg,
    assignmentsCount,
    topLecturesByAccess,
    pendingPayments,
  ] = await Promise.all([
    Students.aggregate([{ $group: { _id: "$Grade", count: { $sum: 1 } } }]),
    Students.aggregate([
      { $addFields: { createdAt: { $toDate: "$_id" } } },
      { $match: { createdAt: { $gte: last30 } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: CAIRO_TZ,
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Lecture.countDocuments(),
    Lecture.aggregate([
      {
        $lookup: {
          from: "years",
          localField: "year",
          foreignField: "_id",
          as: "yearDoc",
        },
      },
      { $unwind: { path: "$yearDoc", preserveNullAndEmptyArrays: true } },
      { $group: { _id: "$yearDoc.name", count: { $sum: 1 } } },
    ]),
    Payment.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    Payment.aggregate([
      { $match: { createdAt: { $gte: last30 } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: CAIRO_TZ,
            },
          },
          count: { $sum: 1 },
          approved: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
          },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          rejected: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Payment.aggregate([
      { $match: { status: "approved" } },
      {
        $lookup: {
          from: Lecture.collection.name,
          localField: "lectureId",
          foreignField: "_id",
          as: "lecture",
        },
      },
      { $unwind: { path: "$lecture", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          revenue: { $sum: { $ifNull: ["$lecture.price", 0] } },
          count: { $sum: 1 },
        },
      },
    ]),
    LectureAccess.aggregate([
      { $group: { _id: "$grantedBy", count: { $sum: 1 } } },
    ]),
    LectureAccess.countDocuments({ createdAt: { $gte: last7 } }),
    ActivationCode.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          used: { $sum: { $cond: ["$isUsed", 1, 0] } },
          unused: { $sum: { $cond: ["$isUsed", 0, 1] } },
        },
      },
    ]),
    Center.countDocuments(),
    ExamResult.aggregate([
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          avgScore: { $avg: "$score" },
          avgTotal: { $avg: "$totalQuestions" },
        },
      },
    ]),
    AssignmentSubmission.countDocuments(),
    LectureAccess.aggregate([
      { $group: { _id: "$lectureId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
      {
        $lookup: {
          from: Lecture.collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "lecture",
        },
      },
      { $unwind: { path: "$lecture", preserveNullAndEmptyArrays: true } },
      { $project: { title: { $ifNull: ["$lecture.title", "محاضرة محذوفة"] }, count: 1 } },
    ]),
    Payment.find({ status: "pending" })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate("studentId", "name studentCode Grade")
      .populate("lectureId", "title price")
      .lean(),
  ]);

  const gradeCounts = countByKey(studentsByGrade, ["Frist", "Second", "Third"]);
  const paymentCounts = countByKey(paymentsByStatus, [
    "pending",
    "approved",
    "rejected",
  ]);
  const accessCounts = countByKey(accessByMethod, ["payment", "admin", "code"]);
  const codes = codesAgg[0] || { total: 0, used: 0, unused: 0 };
  const exam = examResultsAgg[0] || { count: 0, avgScore: 0, avgTotal: 0 };
  const totalStudents =
    gradeCounts.Frist + gradeCounts.Second + gradeCounts.Third;
  const totalPayments =
    paymentCounts.pending + paymentCounts.approved + paymentCounts.rejected;
  const totalAccess =
    accessCounts.payment + accessCounts.admin + accessCounts.code;

  res.status(200).json({
    kpis: {
      totalStudents,
      studentsLast30: studentsLast30.reduce((sum, r) => sum + r.count, 0),
      lectures: lecturesCount,
      pendingPayments: paymentCounts.pending,
      approvedPayments: paymentCounts.approved,
      revenue: revenueAgg[0]?.revenue || 0,
      totalAccess,
      accessLast7,
      centers: centersCount,
      assignments: assignmentsCount,
      exams: exam.count,
      avgExamPercent:
        exam.avgTotal > 0
          ? Math.round((exam.avgScore / exam.avgTotal) * 100)
          : 0,
      codesTotal: codes.total,
      codesUsed: codes.used,
      codesUnused: codes.unused,
    },
    studentsByGrade: [
      { key: "Frist", name: "الصف الأول", value: gradeCounts.Frist },
      { key: "Second", name: "الصف الثاني", value: gradeCounts.Second },
      { key: "Third", name: "الصف الثالث", value: gradeCounts.Third },
    ],
    paymentsByStatus: [
      { key: "pending", name: "قيد الانتظار", value: paymentCounts.pending },
      { key: "approved", name: "مقبول", value: paymentCounts.approved },
      { key: "rejected", name: "مرفوض", value: paymentCounts.rejected },
    ],
    accessByMethod: [
      { key: "payment", name: "دفع إلكتروني", value: accessCounts.payment },
      { key: "code", name: "كود تفعيل", value: accessCounts.code },
      { key: "admin", name: "منح يدوي", value: accessCounts.admin },
    ],
    lecturesByYear: (lecturesByYear || []).map((r) => ({
      name: r._id || "غير محدد",
      value: r.count,
    })),
    studentsTrend: fillDailySeries(studentsLast30, 30).map((d) => ({
      date: d.date,
      count: d.count,
    })),
    paymentsTrend: fillDailySeries(paymentsLast30, 30),
    topLectures: topLecturesByAccess,
    codes: {
      total: codes.total,
      used: codes.used,
      unused: codes.unused,
    },
    pendingPayments: (pendingPayments || []).map((p) => ({
      _id: p._id,
      createdAt: p.createdAt,
      studentName: p.studentId?.name || "طالب",
      studentCode: p.studentId?.studentCode || "",
      lectureTitle: p.lectureId?.title || "محاضرة",
      price: p.lectureId?.price || 0,
    })),
    totals: {
      payments: totalPayments,
    },
  });
});

export const logout = asyncHandler(async (req, res, next) => {
  const { id } = req.user;

  if (req.user.role !== "admin" && req.user.role !== "assistant") {
    return next(new Error("انت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }

  const tokens = await Token.find({ user: id });
  tokens.forEach(async (token) => {
    token.isValid = false;
    await token.save();
  });
  res.status(200).json({ message: "تم تسجيل الخروج بنجاح" });
});
