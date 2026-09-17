import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import * as questionController from "../controllers/questionController";

// 题库路由（仅管理员）
export const questionRouter = Router();

questionRouter.get("/admin/questions", authenticate, requireRole("admin"), asyncHandler(questionController.listQuestions));
questionRouter.post("/admin/questions", authenticate, requireRole("admin"), asyncHandler(questionController.createQuestion));
