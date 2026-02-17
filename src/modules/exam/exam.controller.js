import { Exam } from "../../../DB/models/exam.js";
import { Lecture } from "../../../DB/models/lecture.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ExamResult } from "../../../DB/models/examResult.js";
import { StudentProgress } from "../../../DB/models/studentProgress.js";

export const addExam = asyncHandler(async (req, res, next) => {
  const user = req.user;

  if (user.role !== "admin" && user.role !== "assistant") {
    return next(new Error("غير مسموح لك بالقيام بهذه العملية", { cause: 403 }));
  }

  const { lectureId } = req.params;
  let { questions } = req.body;

  if (typeof questions === "string") {
    try {
      questions = JSON.parse(questions);
    } catch (err) {
      return res
        .status(400)
        .json({ message: " طريقه كتابه الاسئله غير صحيحه" });
    }
  }

  if (!Array.isArray(questions)) {
    return res.status(400).json({ message: "الأسئلة يجب أن تكون مصفوفة" });
  }

  const lecture = await Lecture.findById(lectureId);
  if (!lecture) {
    return next(new Error("المحاضرة غير موجودة", { cause: 404 }));
  }

  const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

  let fileIndex = 0;
  const questionsWithImages = questions.map((q) => {
    let imgUrl = "";
    if (q.hasImage && req.files && req.files[fileIndex]) {
      const filename = req.files[fileIndex].filename;
      imgUrl = `${BASE_URL}/uploads/exams_pics/${filename}`;
      fileIndex++;
    }
    return { ...q, img: imgUrl };
  });

  const exam = await Exam.create({
    lecture: lectureId,
    questions: questionsWithImages,
  });

  res.status(201).json({
    message: "تم إضافة الاختبار بنجاح",
    exam,
  });
});

export const examsByLecture = asyncHandler(async (req, res, next) => {
  const { lectureId } = req.params;
  const user = req.user;

  const exams = await Exam.find({ lecture: lectureId });
  if (!exams) {
    return next(new Error("الاختبارات غير موجودة", { cause: 404 }));
  }
  res.status(200).json({
    success: true,
    count: exams.length,
    data: exams,
  });
});

export const submitExam = asyncHandler(async (req, res, next) => {
  const studentId = req.student.id;
  const { examId, answers } = req.body;

  const exam = await Exam.findById(examId).populate("lecture");
  if (!exam) {
    return next(new Error("الاختبار غير موجود", { cause: 404 }));
  }

  let correctCount = 0;
  const detailedAnswers = [];

  // تصحيح الإجابات
  for (const submitted of answers) {
    const original = exam.questions.find(
      (q) => q.question === submitted.question,
    );

    if (!original) {
      detailedAnswers.push({
        question: submitted.question,
        chosenAnswer: submitted.chosenAnswer,
        isCorrect: false,
        notFound: true,
        message: "هذا السؤال غير موجود في الاختبار",
      });
      continue;
    }

    const isCorrect = original.correctAnswer === submitted.chosenAnswer;
    if (isCorrect) correctCount++;

    detailedAnswers.push({
      question: submitted.question,
      chosenAnswer: submitted.chosenAnswer,
      isCorrect,
    });
  }

  // الأسئلة اللي متجاوبتش
  for (const original of exam.questions) {
    const answered = answers.find((a) => a.question === original.question);
    if (!answered) {
      detailedAnswers.push({
        question: original.question,
        chosenAnswer: null,
        isCorrect: false,
        notAnswered: true,
        message: "لم يتم الإجابة على هذا السؤال",
      });
    }
  }

  const totalQuestions = exam.questions.length;
  const score = correctCount;
  const percentage = (score / totalQuestions) * 100;

  await ExamResult.create({
    studentId,
    examId,
    score,
    totalQuestions,
    percentage,
    answers: detailedAnswers,
  });

  const passed = percentage >= 50;

  if (passed) {
    await StudentProgress.findOneAndUpdate(
      { studentId, lectureId: exam.lecture._id },
      { examDone: true },
      { upsert: true, new: true },
    );
  }

  // 🟢 منطق التحفيز
  let motivationMessage = "";
  let motivationLevel = "";

  if (percentage >= 90) {
    motivationLevel = "excellent";
    motivationMessage = "مستوى ممتاز جدًا 🔥 أداء احترافي، كمّل بنفس القوة!";
  } else if (percentage >= 75) {
    motivationLevel = "very_good";
    motivationMessage = "شغل عالي 👏 فاضلك خطوة وتبقى من الأوائل";
  } else if (percentage >= 50) {
    motivationLevel = "good";
    motivationMessage = "نتيجة كويسة 👍 ركّز شوية وهتوصل للأفضل";
  } else {
    motivationLevel = "needs_improvement";
    motivationMessage = "متحبطش 💪 راجع وحاول تاني، النجاح قرب";
  }

  res.status(200).json({
    message: "تم تقديم الاختبار بنجاح",
    score,
    totalQuestions,
    percentage,
    passed,
    motivationLevel,
    motivationMessage,
    detailedAnswers,
  });
});
