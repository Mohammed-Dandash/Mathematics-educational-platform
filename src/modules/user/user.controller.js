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

  const studentData = { ...student.toObject(), examsResults, progress };
  res.status(200).json(studentData);
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
