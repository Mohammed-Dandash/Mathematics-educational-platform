import { Lecture } from "../../../DB/models/lecture.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { Year } from "../../../DB/models/year.js";
import mongoose from "mongoose";
import { Exam } from "./../../../DB/models/exam.js";
import { Branch } from "../../../DB/models/branch.js";
import { Types } from "mongoose";

export const createBranch = async (req, res, next) => {
  try {
    const { name, description, year } = req.body;

    if (!mongoose.isValidObjectId(year)) {
      return res.status(400).json({ message: "Year ID غير صالح" });
    }

    const yearExists = await Year.findById(year);
    if (!yearExists) {
      return res.status(404).json({ message: "السنة غير موجودة" });
    }

    const branch = await Branch.create({
      name,
      description,
      year,
    });

    res.status(201).json({
      message: "تم إنشاء الفرع بنجاح",
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};

export const getBranchesByYear = async (req, res, next) => {
  try {
    const { yearId } = req.params;

    if (!Types.ObjectId.isValid(yearId)) {
      return res.status(400).json({ message: "Year ID غير صالح" });
    }

    const branches = await Branch.aggregate([
      { $match: { year: new Types.ObjectId(yearId) } },

      {
        $lookup: {
          from: "lectures",
          localField: "_id",
          foreignField: "branch",
          as: "lectures",
        },
      },
      {
        $lookup: {
          from: "exams",
          localField: "_id",
          foreignField: "branch",
          as: "exams",
        },
      },
      {
        $addFields: {
          lecturesCount: { $size: "$lectures" },
          examsCount: { $size: "$exams" },
          lastLectureUpdate: { $max: "$lectures.createdAt" },
        },
      },
      {
        $project: {
          name: 1,
          description: 1,
          createdAt: 1,
          lecturesCount: 1,
          examsCount: 1,
          lastLectureUpdate: 1,
        },
      },
    ]);

    res.status(200).json({
      results: branches.length,
      data: branches,
    });
  } catch (error) {
    next(error);
  }
};

export const getBranchById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Branch ID غير صالح" });
    }

    const branch = await Branch.findById(id).populate("year", "name");

    if (!branch) {
      return res.status(404).json({ message: "الفرع غير موجود" });
    }

    res.status(200).json({ data: branch });
  } catch (error) {
    next(error);
  }
};
export const updateBranch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Branch ID غير صالح" });
    }

    const branch = await Branch.findByIdAndUpdate(
      id,
      { name, description },
      { new: true, runValidators: true }
    );

    if (!branch) {
      return res.status(404).json({ message: "الفرع غير موجود" });
    }

    res.status(200).json({
      message: "تم تحديث الفرع بنجاح",
      data: branch,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteBranch = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Branch ID غير صالح" });
    }

    const lecturesCount = await Lecture.countDocuments({ branch: id });
    const examsCount = await Exam.countDocuments({ branch: id });

    if (lecturesCount > 0 || examsCount > 0) {
      return res.status(400).json({
        message: "لا يمكن حذف الفرع لوجود محاضرات أو امتحانات مرتبطة به",
      });
    }

    const branch = await Branch.findByIdAndDelete(id);

    if (!branch) {
      return res.status(404).json({ message: "الفرع غير موجود" });
    }

    res.status(200).json({
      message: "تم حذف الفرع بنجاح",
    });
  } catch (error) {
    next(error);
  }
};

export const getBranchIdsAndNamesByYear = async (req, res, next) => {
  try {
    const { yearId } = req.params;

    if (!Types.ObjectId.isValid(yearId)) {
      return res.status(400).json({ message: "Year ID غير صالح" });
    }

    const branches = await Branch.find(
      { year: yearId },
      { name: 1 } // بيرجع _id تلقائي
    ).sort({ createdAt: 1 });

    res.status(200).json({
      results: branches.length,
      data: branches,
    });
  } catch (error) {
    next(error);
  }
};
