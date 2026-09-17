import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import * as submissionController from "../controllers/submissionController";

// 提交/成绩路由（学生 + 管理员），统一挂在 /api 下
export const submissionRouter = Router();

// 学生
submissionRouter.post("/submissions/start", authenticate, requireRole("student"), asyncHandler(submissionController.startExam));
submissionRouter.post("/submissions/:id/submit", authenticate, requireRole("student"), asyncHandler(submissionController.submitExam));
submissionRouter.get("/student/history", authenticate, requireRole("student"), asyncHandler(submissionController.getStudentHistory));

// 管理员
submissionRouter.get("/admin/submissions", authenticate, requireRole("admin"), asyncHandler(submissionController.listSubmissions));
submissionRouter.get("/admin/submissions/:id", authenticate, requireRole("admin"), asyncHandler(submissionController.getSubmissionDetail));
submissionRouter.patch("/admin/submissions/:id/review", authenticate, requireRole("admin"), asyncHandler(submissionController.reviewSubmission));
