import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import * as questionService from "../services/questionService";
import { ok } from "../utils/response";

export async function listQuestions(req: AuthRequest, res: Response) {
  const { category, type } = req.query;
  const questions = await questionService.listQuestions({
    category: typeof category === "string" ? category : undefined,
    type: typeof type === "string" ? type : undefined,
  });
  return ok(res, questions);
}

export async function createQuestion(req: AuthRequest, res: Response) {
  const question = await questionService.createQuestion(req.body ?? {});
  return ok(res, question, 201);
}
