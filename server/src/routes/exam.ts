import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import * as examController from "../controllers/examController";

// 考试相关路由（学生 + 管理员），统一挂在 /api 下
export const examRouter = Router();

// 学生
examRouter.get("/exams", authenticate, requireRole("student"), asyncHandler(examController.listPublishedExams));
examRouter.get("/exams/:id", authenticate, requireRole("student"), asyncHandler(examController.getPublishedExamDetail));

// 管理员
examRouter.get("/admin/exams", authenticate, requireRole("admin"), asyncHandler(examController.listAllExams));
examRouter.post("/admin/exams", authenticate, requireRole("admin"), asyncHandler(examController.createExam));
examRouter.patch("/admin/exams/:id", authenticate, requireRole("admin"), asyncHandler(examController.updateExam));
