import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import { AppError } from "../middleware/error";
import * as submissionService from "../services/submissionService";
import { ok } from "../utils/response";

export async function startExam(req: AuthRequest, res: Response) {
  const { examId } = req.body ?? {};
  if (!examId || typeof examId !== "string") {
    throw new AppError(400, "缺少必填字段：examId");
  }
  const result = await submissionService.startExam(req.user!.sub, examId);
  return ok(res, result, 201);
}

export async function submitExam(req: AuthRequest, res: Response) {
  const { answers } = req.body ?? {};
  const result = await submissionService.submitExam(
    req.user!.sub,
    req.params.id,
    answers
  );
  return ok(res, result);
}

export async function getStudentHistory(req: AuthRequest, res: Response) {
  return ok(res, await submissionService.getStudentHistory(req.user!.sub));
}

export async function listSubmissions(req: AuthRequest, res: Response) {
  const { examId, status } = req.query;
  const submissions = await submissionService.listSubmissions({
    examId: typeof examId === "string" ? examId : undefined,
    status: typeof status === "string" ? status : undefined,
  });
  return ok(res, submissions);
}

export async function getSubmissionDetail(req: AuthRequest, res: Response) {
  return ok(res, await submissionService.getSubmissionDetail(req.params.id));
}

export async function reviewSubmission(req: AuthRequest, res: Response) {
  const { reviews } = req.body ?? {};
  const result = await submissionService.reviewSubmission(
    req.params.id,
    reviews
  );
  return ok(res, result);
}
