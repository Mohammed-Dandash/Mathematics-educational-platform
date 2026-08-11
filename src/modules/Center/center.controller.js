import { Center } from "../../../DB/models/center.js"; 
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ActivationCode } from "../../../DB/models/ActivationCode.js";
import mongoose from "mongoose";

// ================= Create Center =================
export const createCenter = asyncHandler(async (req, res, next) => {
  const { name, location, contact } = req.body;
  const user = req.user;

  if (user.role !== "admin" && user.role !== "assistant") {
    return next(new Error("أنت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }

  if (!name) {
    return next(new Error("اسم السنتر مطلوب", { cause: 400 }));
  }

  const existingCenter = await Center.findOne({ name });
  if (existingCenter) {
    return next(new Error("اسم السنتر مسجل مسبقاً", { cause: 400 }));
  }

  const center = await Center.create({
    name,
    location,
    contact,
    createdBy: user._id,
  });

  res.status(201).json({
    message: "تم إنشاء السنتر بنجاح",
    data: center,
  });
});

// ================= Get All Centers =================
export const getAllCenters = asyncHandler(async (req, res, next) => {
  const user = req.user;

  if (user.role !== "admin" && user.role !== "assistant") {
    return next(new Error("أنت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // 1. حساب إجمالي عدد المراكز لمعرفة عدد الصفحات الكلي
  const totalItems = await Center.countDocuments();
  const totalPages = Math.ceil(totalItems / limit);

  // 2. جلب داتا الصفحة الحالية
  const centers = await Center.find()
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("createdBy", "username");

  res.status(200).json({
    pagination: {
      currentPage: page,
      totalPages: totalPages,
      totalItems: totalItems
    },
    results: centers.length,
    data: centers,
  });
});

// ================= Get Center =================
export const getCenter = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  if (user.role !== "admin" && user.role !== "assistant") {
    return next(new Error("أنت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }

  const center = await Center.findById(id).populate("createdBy", "username");
  if (!center) {
    return next(new Error("السنتر غير موجود", { cause: 404 }));
  }
  res.status(200).json({
    data: center,
  });
});
// ================= Update Center =================
export const updateCenter = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { name, location, contact, isActive } = req.body;
  const user = req.user;

  if (user.role !== "admin" && user.role !== "assistant") {
    return next(new Error("أنت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new Error("Center ID غير صالح", { cause: 400 }));
  }

  if (name) {
    const existingName = await Center.findOne({ name, _id: { $ne: id } });
    if (existingName) {
      return next(new Error("هذا الاسم مستخدم لسنتر آخر", { cause: 400 }));
    }
  }

  const center = await Center.findByIdAndUpdate(
    id,
    { name, location, contact, isActive },
    { new: true } 
  );

  if (!center) {
    return next(new Error("السنتر غير موجود", { cause: 404 }));
  }

  res.status(200).json({
    message: "تم تحديث بيانات السنتر بنجاح",
    data: center,
  });
});

// ================= Delete Center =================
export const deleteCenter = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const user = req.user;

  if (user.role !== "admin" && user.role !== "assistant") {
    return next(new Error("أنت لا تملك الصلاحية المطلوبة", { cause: 403 }));
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new Error("Center ID غير صالح", { cause: 400 }));
  }

  const hasCodes = await ActivationCode.exists({ centerId: id });
  if (hasCodes) {
    return next(
      new Error("لا يمكن حذف هذا السنتر لوجود أكواد مرتبطة به، يمكنك إيقاف تفعيله بدلاً من ذلك", { cause: 400 })
    );
  }

  const center = await Center.findByIdAndDelete(id);
  if (!center) {
    return next(new Error("السنتر غير موجود", { cause: 404 }));
  }

  res.status(200).json({
    message: "تم حذف السنتر بنجاح",
  });
});