import jwt from "jsonwebtoken";
import { asyncHandler } from "../utils/asyncHandler.js";
import { StudentTokenMobile } from "../../DB/models/studentToken.js";
import Student from "../../DB/models/Student.js";
export const studentAuthMobile = asyncHandler(async (req, res, next) => {
  let header = req.headers["token"];
  if (!header || !header.startsWith("Bearer ")) {
    return next(new Error("No token provided", { cause: 401 }));
  }

  const raw = header.split(" ")[1];

  let decoded;
  try {
    decoded = jwt.verify(raw, process.env.JWT_SECRET || process.env.SECRET_KEY);
  } catch {
    return next(new Error("Invalid token", { cause: 401 }));
  }

  const tokenDb = await StudentTokenMobile.findOne({ token: raw, isValid: true });
  if (!tokenDb) return next(new Error("Token not found", { cause: 401 }));

  if (tokenDb.expiredAt <= new Date()) {
    tokenDb.isValid = false;
    await tokenDb.save();
    return next(new Error("Token expired", { cause: 401 }));
  }

  const student = await Student.findById(decoded.id);
  if (!student) return next(new Error("Student not found", { cause: 404 }));

  req.studentMobile = student;
  req.token = raw;
  next();
});
