import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import * as statsService from "../services/statsService";
import { ok } from "../utils/response";

export async function overview(_req: AuthRequest, res: Response) {
  return ok(res, await statsService.getScoresOverview());
}

export async function exams(_req: AuthRequest, res: Response) {
  return ok(res, await statsService.getExamScoreStats());
}

export async function questions(_req: AuthRequest, res: Response) {
  return ok(res, await statsService.getQuestionErrorStats());
}
