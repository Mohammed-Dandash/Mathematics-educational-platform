import { asyncHandler } from "../../utils/asyncHandler.js";
import Student from "../../../DB/models/Student.js"
import { Lecture } from "../../../DB/models/lecture.js";
import { Payment } from "../../../DB/models/payment.js";
import fs from "fs/promises";
import { Branch } from "../../../DB/models/branch.js";
import { AssignmentSubmission } from "../../../DB/models/assismentResult.js";

import path from "path";

const toUploadsRelative = (p) => {
  if (!p || typeof p !== "string") return p;
  const norm = p.replace(/\\/g, "/"); // لو ويندوز
  return norm.replace(/^.*uploads\//, "uploads/");
};

const toFullImageUrl = (imagePath, req) => {
  if (!imagePath || typeof imagePath !== "string") return imagePath;
  const relativePath = imagePath.replace(/^.*uploads[\\/]/, "uploads/");
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/${relativePath}`;
};

const toFullImageUrls = (imagePaths, req) => {
  if (!Array.isArray(imagePaths)) return imagePaths;
  return imagePaths.map(img => toFullImageUrl(img, req));
};

export const createPaymentWithReceipt = asyncHandler(async (req, res, next) => {
  const stu = req.student;
  const studentId = stu?._id || stu?.id;
  if (!studentId)
    return next(new Error("Students only (unauthorized)", { cause: 401 }));

  const lectureId = req.params.lectureId || req.body.lectureId;
  if (!lectureId)
    return next(new Error("lectureId is required", { cause: 400 }));

  // 1) جيب آخر صورة
  let lastImagePath;
  if (req.file && req.file.mimetype?.startsWith("image/")) {
    lastImagePath = toUploadsRelative(req.file.path);
  } else if (Array.isArray(req.files) && req.files.length > 0) {
    const lastFile = req.files[req.files.length - 1];
    if (!lastFile.mimetype?.startsWith("image/")) {
      return next(new Error("Only image receipts are allowed", { cause: 400 }));
    }
    lastImagePath = toUploadsRelative(lastFile.path);
  } else {
    return next(new Error("Receipt image is required", { cause: 400 }));
  }

  const [lec, stuDoc] = await Promise.all([
    Lecture.findById(lectureId, { title: 1 }).lean(),
    Student.findById(studentId, { name: 1 }).lean(),
  ]);
  if (!lec) return next(new Error("Lecture not found", { cause: 404 }));
  if (!stuDoc) return next(new Error("Student not found", { cause: 404 }));

  const safeUnlinkMany = async (arr) => {
    if (!Array.isArray(arr)) return;
    await Promise.all(
      arr.map(async (p) => {
        if (!p) return;
        if (
          typeof p === "string" &&
          (p.startsWith("http://") || p.startsWith("https://"))
        )
          return;
        try {
          await fs.unlink(p);
        } catch {}
      })
    );
  };

  const lastPayment = await Payment.findOne({ studentId, lectureId }).sort({
    createdAt: -1,
  });

  if (lastPayment && lastPayment.status === "pending") {
    await Payment.deleteMany({
      studentId,
      lectureId,
      status: "pending",
      _id: { $ne: lastPayment._id },
    });

    await safeUnlinkMany(lastPayment.image);
    lastPayment.image = [lastImagePath];
    await lastPayment.save();

    return res.status(200).json({
      message: "تم تحديث الإيصال بنجاح",
      paymentId: lastPayment._id,
      lectureTitle: lec.title,
      studentName: stuDoc.name,
      status: lastPayment.status,
      image: toFullImageUrls(lastPayment.image, req),
    });
  }

  if (lastPayment && lastPayment.status === "rejected") {
    await safeUnlinkMany(lastPayment.image);
    await Payment.updateOne(
      { _id: lastPayment._id },
      { $set: { image: [] } }
    );

    const payment = await Payment.create({
      studentId,
      lectureId,
      image: [lastImagePath],
      status: "pending",
    });

    return res.status(201).json({
      message: "تم استلام إيصال جديد. برجاء انتظار تأكيد الدفع.",
      paymentId: payment._id,
      lectureTitle: lec.title,
      studentName: stuDoc.name,
      status: payment.status,
      image: toFullImageUrls(payment.image, req),
    });
  }

  const payment = await Payment.create({
    studentId,
    lectureId,
    image: [lastImagePath],
    status: "pending",
  });

  return res.status(201).json({
    message: "تم استلام الإيصال. بالرجاء انتظار تحقق الدفع.",
    paymentId: payment._id,
    lectureTitle: lec.title,
    studentName: stuDoc.name,
    status: payment.status,
    image: toFullImageUrls(payment.image, req),
  });
});



export const listPayments = asyncHandler(async (req, res, next) => {
  const { status, page = 1, limit = 10 } = req.query;

  const match = {};
  if (status) {
    const allowed = ["pending", "approved", "rejected"];
    if (!allowed.includes(status)) {
      return next(new Error("Invalid status", { cause: 400 }));
    }
    match.status = status;
  }

  const pageNumber = Math.max(1, parseInt(page, 10));
  const pageSize = Math.max(1, parseInt(limit, 10));

  const skip = (pageNumber - 1) * pageSize;

  const total = await Payment.countDocuments(match);

  const payments = await Payment.find(match)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .populate([
      { path: "studentId", select: "name" },
      {
        path: "lectureId",
        select: "title year",
        populate: { path: "year", select: "name" },
      },
    ])
    .lean();

  const data = payments.map((p) => ({
    paymentId: p._id,
    studentId: p.studentId?._id || null,
    studentName: p.studentId?.name || null,
    lectureId: p.lectureId?._id || null,
    status: p.status,
    yearName: p.lectureId?.year?.name || null,
    lectureTitle: p.lectureId?.title || null,
    createdAt: p.createdAt,
  }));

  return res.status(200).json({
    total,
    page: pageNumber,
    pages: Math.ceil(total / pageSize),
    limit: pageSize,
    data,
  });
});




const resolveReviewerFromToken = async (req) => {
  // 1) لو الميدلوير حاطط يوزر ستاف جاهز
  if (req.user && req.user.kind === "user" && ["admin", "assistant"].includes(req.user.role)) {
    return { id: req.user.id, role: req.user.role };
  }

  // 2) استخرج الـ JWT من الهيدر
  let header = req.headers.authorization || req.headers.Authorization || req.headers.token;
  if (!header) return null;
  const PREFIX = (process.env.BEARER_TOKEN || "Bearer") + " ";
  let raw = header.startsWith("Bearer ") ? header.slice(7)
           : header.startsWith(PREFIX)    ? header.slice(PREFIX.length)
           : header;

  if (!raw) return null;

  // 3) verify jwt (اختياري لمزيد أمان)
  const SECRET = process.env.JWT_SECRET || process.env.SECRET_KEY;
  try { jwt.verify(raw, SECRET); } catch { return null; }

  // 4) دور على التوكن في DB وتأكد إنه صالح
  const now = new Date();
  const tokenDoc = await Token.findOne({ token: raw, isValid: true, expiredAt: { $gt: now } }).lean();
  if (!tokenDoc) return null;

  // 5) استنتج هوية اليوزر من سكيمة التوكن
  let userId = null;
  if (tokenDoc.user) userId = tokenDoc.user; // سكيمة قديمة
  else if (tokenDoc.subjectType === "user" && tokenDoc.subjectId) userId = tokenDoc.subjectId; // سكيمة موحّدة

  if (!userId) return null;

  // 6) تأكد إنه ستاف (admin/assistant)
  const u = await User.findById(userId, { role: 1 }).lean();
  if (!u || !["admin", "assistant"].includes(u.role)) return null;

  return { id: userId, role: u.role };
};

const ensureStaff = (req) => {
  if (!req.user || !["admin", "assistant"].includes(req.user.role)) {
    const err = new Error("Forbidden");
    err.cause = 403;
    throw err;
  }
};

export const getPayment = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const payment = await Payment.findById(id)
    .populate([
      { path: "studentId", select: "name" },
      {
        path: "lectureId",
        select: "title year",
        populate: { path: "year", select: "name" },
      },
    ])
    .lean();

  if (!payment) {
    return next(new Error("Payment not found", { cause: 404 }));
  }

  return res.status(200).json({
    payment,
  });
});

export const updatePaymentStatus = asyncHandler(async (req, res, next) => {
  ensureStaff(req); // لازم يكون داخل بميدلوير اليوزر (مش الطالب)

  const { id } = req.params;               // paymentId
  const { status, note } = req.body || {};

  const allowed = ["approved", "rejected", "pending"];
  if (!allowed.includes(status)) {
    return next(new Error("Invalid status", { cause: 400 }));
  }

  const payment = await Payment.findById(id);
  if (!payment) return next(new Error("Payment not found", { cause: 404 }));

  if (payment.status === status) {
    return next(new Error("Payment already in this status", { cause: 409 }));
  }

  payment.status = status;
  if (typeof note === "string") payment.note = note.trim() || undefined;
  payment.reviewedBy = req.user.id || req.user._id;
  payment.reviewedAt = new Date();
  await payment.save();

  const [student, lecture] = await Promise.all([
    Student.findById(payment.studentId, { name: 1 }).lean(),
    Lecture.findById(payment.lectureId, { title: 1 })
           .populate({ path: "branch", select: "name" })
           .lean(),
  ]);

  return res.status(200).json({
    message: "Payment status updated",
    paymentId: payment._id,
    status: payment.status,
    studentId: payment.studentId,
    studentName: student?.name || null,
    lectureId: lecture?._id || payment.lectureId,
    lectureTitle: lecture?.title || null,
    yearName: lecture?.year?.name || null,
    note: payment.note || null,
    reviewedAt: payment.reviewedAt,
    reviewedBy: payment.reviewedBy,
    img: toFullImageUrls(payment.image, req)
  });
});
function toFullImageUr(files = [], req) {
  if (!files || !Array.isArray(files)) return [];

  // host + protocol
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  return files.map(f => {
    // نتأكد إن الـ path بيبدأ من uploads
    let cleanPath = f;
    if (f.startsWith("uploads/")) {
      cleanPath = f;
    } else if (f.includes("uploads/")) {
      cleanPath = f.substring(f.indexOf("uploads/"));
    }
    return `${baseUrl}/${cleanPath}`;
  });
}


export const listAssignments = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;

  const pageNumber = Math.max(1, parseInt(page, 10));
  const pageSize = Math.max(1, parseInt(limit, 10));
  const skip = (pageNumber - 1) * pageSize;

  const total = await AssignmentSubmission.countDocuments();

  const assignments = await AssignmentSubmission.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(pageSize)
    .populate([
      { path: "studentId", select: "name" },
      {
        path: "lectureId",
        select: "title year",
        populate: { path: "year", select: "name" },
      },
    ])
    .lean();

    // console.log(assignments);
    const data = assignments.map((a) => ({
      assignmentId: a._id,
      studentId: a.studentId?._id || null,
      studentName: a.studentId?.name || null,
      lectureId: a.lectureId?._id || null,
      lectureTitle: a.lectureId?.title || null,
      yearName: a.lectureId?.year?.name || null,
      images: a.images,   // الصور كلها روابط كاملة
      createdAt: a.createdAt,
    }));
    

  return res.status(200).json({
    total,
    page: pageNumber,
    pages: Math.ceil(total / pageSize),
    limit: pageSize,
    data,
  });
});
