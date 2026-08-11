import { ActivationCode } from "../../../DB/models/ActivationCode.js";
import { Center } from "../../../DB/models/center.js";
import { Lecture } from "../../../DB/models/lecture.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import mongoose from "mongoose";
import crypto from "crypto";

// ================= Generate Codes (Bulk Create) =================
const generateReadableCode = (length = 8) => {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; 
  let code = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    code += chars[randomIndex];
  }
  return code;
};

export const generateCodes = asyncHandler(async (req, res, next) => {
  const { centerId, lectureId, count } = req.body;
  const user = req.user;

  if (user.role !== "admin" && user.role !== "assistant") {
    return next(new Error("أنت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }

  if (!centerId || !lectureId || !count || count <= 0) {
    return next(new Error("centerId, lectureId, و count (أكبر من 0) مطلوبين", { cause: 400 }));
  }

  if (!mongoose.Types.ObjectId.isValid(centerId) || !mongoose.Types.ObjectId.isValid(lectureId)) {
    return next(new Error("IDs غير صالحة", { cause: 400 }));
  }

  const [centerExists, lectureExists] = await Promise.all([
    Center.findById(centerId),
    Lecture.findById(lectureId)
  ]);

  if (!centerExists) return next(new Error("السنتر غير موجود", { cause: 404 }));
  if (!lectureExists) return next(new Error("المحاضرة غير موجودة", { cause: 404 }));

  const codesToInsert = [];
  
  const generatedSet = new Set(); 

  while (codesToInsert.length < count) {
    const newCode = generateReadableCode(8); 
    
    if (!generatedSet.has(newCode)) {
      generatedSet.add(newCode);
      codesToInsert.push({
        code: newCode,
        centerId,
        lectureId,
        generatedBy: user._id,
        isUsed: false
      });
    }
  }

  try {
    await ActivationCode.insertMany(codesToInsert);
  } catch (error) {
    if (error.code === 11000) {
      return next(new Error("حدث تكرار في توليد الأكواد، برجاء المحاولة مرة أخرى", { cause: 500 }));
    }
    throw error;
  }

  res.status(201).json({
    message: `تم توليد عدد ${count} كود بنجاح`,
    data: codesToInsert.map(c => c.code) 
  });
});

// ================= Get Codes By Center & Lecture =================
export const getCodesStats = asyncHandler(async (req, res, next) => {
  const { centerId, lectureId } = req.query;
  const user = req.user;

  if (user.role !== "admin" && user.role !== "assistant") {
    return next(new Error("أنت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }

  const matchStage = {};
  if (centerId && mongoose.Types.ObjectId.isValid(centerId)) {
    matchStage.centerId = new mongoose.Types.ObjectId(centerId);
  }
  if (lectureId && mongoose.Types.ObjectId.isValid(lectureId)) {
    matchStage.lectureId = new mongoose.Types.ObjectId(lectureId);
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // 1. حساب الإحصائيات (الـ total هنا بيمثل العدد الكلي اللي هنحسب بيه الصفحات)
  const total = await ActivationCode.countDocuments(matchStage);
  const used = await ActivationCode.countDocuments({ ...matchStage, isUsed: true });
  const unused = total - used;

  // 2. حساب عدد الصفحات الكلي
  const totalPages = Math.ceil(total / limit);

  // 3. جلب داتا الصفحة الحالية
  const codes = await ActivationCode.find(matchStage)
    .populate("centerId", "name")
    .populate("lectureId", "title")
    .populate("usedBy", "name studentCode")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.status(200).json({
    pagination: {
      currentPage: page,
      totalPages: totalPages,
      totalItems: total
    },
    stats: { total, used, unused },
    data: codes
  });
});


// ================= Delete Unused Codes (Bulk or Single) =================
export const deleteUnusedCodes = asyncHandler(async (req, res, next) => {
  const { centerId, lectureId } = req.body;
  const user = req.user;

  if (user.role !== "admin" && user.role !== "assistant") {
    return next(new Error("أنت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }

  if (!centerId || !lectureId) {
    return next(new Error("الرجاء تحديد السنتر والمحاضرة لحذف أكوادهم غير المستخدمة", { cause: 400 }));
  }

  const result = await ActivationCode.deleteMany({
    centerId,
    lectureId,
    isUsed: false 
  });

  res.status(200).json({
    message: `تم حذف ${result.deletedCount} كود غير مستخدم بنجاح`,
  });
});