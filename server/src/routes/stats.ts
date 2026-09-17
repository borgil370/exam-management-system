import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import * as statsController from "../controllers/statsController";

// 成绩统计路由（仅管理员），挂在 /api/admin/scores 下
export const statsRouter = Router();

statsRouter.use(authenticate, requireRole("admin"));

statsRouter.get("/overview", asyncHandler(statsController.overview));
statsRouter.get("/exams", asyncHandler(statsController.exams));
statsRouter.get("/questions", asyncHandler(statsController.questions));
