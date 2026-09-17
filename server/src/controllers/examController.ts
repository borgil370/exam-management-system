import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import * as examService from "../services/examService";
import { ok } from "../utils/response";

// controller：只做"解析请求 → 调 service → 统一返回"，业务错误由 error 中间件兜底

export async function listPublishedExams(_req: AuthRequest, res: Response) {
  return ok(res, await examService.listPublishedExams());
}

export async function getPublishedExamDetail(req: AuthRequest, res: Response) {
  return ok(res, await examService.getPublishedExamDetail(req.params.id));
}

export async function listAllExams(_req: AuthRequest, res: Response) {
  return ok(res, await examService.listAllExams());
}

export async function createExam(req: AuthRequest, res: Response) {
  const exam = await examService.createExam(req.body ?? {});
  return ok(res, exam, 201);
}

export async function updateExam(req: AuthRequest, res: Response) {
  const exam = await examService.updateExam(req.params.id, req.body ?? {});
  return ok(res, exam);
}
