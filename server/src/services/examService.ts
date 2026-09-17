import {
  dbCreateExam,
  dbGetExam,
  dbGetExamWithQuestions,
  dbGetQuestionsByIds,
  dbListExams,
  dbUpdateExam,
} from "../db";
import { AppError } from "../middleware/error";
import type { Exam, ExamStatus } from "../types";

// 考试业务规则：创建校验、状态流转。不碰 req/res，出错抛 AppError。

// 状态机：只允许 draft → published → closed
const allowedTransitions: Record<ExamStatus, ExamStatus[]> = {
  draft: ["published"],
  published: ["closed"],
  closed: [],
};

function toPublicExam(exam: Exam) {
  // 学生端列表不附带题目信息
  return {
    id: exam.id,
    title: exam.title,
    description: exam.description,
    durationMinutes: exam.durationMinutes,
    startTime: exam.startTime,
    status: exam.status,
    totalScore: exam.totalScore,
    questionCount: exam.questionIds.length,
  };
}

export async function listPublishedExams() {
  const exams = await dbListExams();
  return exams.filter((e) => e.status === "published").map(toPublicExam);
}

export async function listAllExams() {
  const exams = await dbListExams();
  return exams.map(toPublicExam);
}

// 学生查看考试详情：必须是已发布考试，题目剥离 correctAnswer
export async function getPublishedExamDetail(id: string) {
  const found = await dbGetExamWithQuestions(id);
  if (!found || found.exam.status !== "published") {
    throw new AppError(404, "考试不存在或未发布");
  }
  const questions = found.questions.map((q) => ({
    id: q.id,
    type: q.type,
    stem: q.stem,
    options: q.options,
    score: q.score,
    category: q.category,
  }));
  return { ...toPublicExam(found.exam), questions };
}

export interface CreateExamInput {
  title?: unknown;
  description?: unknown;
  durationMinutes?: unknown;
  startTime?: unknown;
  questionIds?: unknown;
}

export async function createExam(input: CreateExamInput) {
  if (!input.title || typeof input.title !== "string") {
    throw new AppError(400, "缺少必填字段：title（考试标题）");
  }
  if (
    typeof input.durationMinutes !== "number" ||
    input.durationMinutes <= 0
  ) {
    throw new AppError(400, "缺少必填字段：durationMinutes（正整数，单位分钟）");
  }
  if (!input.startTime || typeof input.startTime !== "string") {
    throw new AppError(400, "缺少必填字段：startTime（开考时间）");
  }
  if (!Array.isArray(input.questionIds) || input.questionIds.length === 0) {
    throw new AppError(400, "缺少必填字段：questionIds（非空数组）");
  }

  // 校验题目都存在（一次 IN 查询批量取回），总分由所选题目分值合计
  const questionIds = input.questionIds.map(String);
  const byId = new Map(
    (await dbGetQuestionsByIds(questionIds)).map((q) => [q.id, q])
  );
  let totalScore = 0;
  for (const qid of questionIds) {
    const question = byId.get(qid);
    if (!question) {
      throw new AppError(400, `题目不存在：${qid}`);
    }
    totalScore += question.score;
  }

  const exam = await dbCreateExam({
    title: input.title,
    description: typeof input.description === "string" ? input.description : "",
    durationMinutes: input.durationMinutes,
    startTime: input.startTime,
    status: "draft",
    questionIds: input.questionIds.map(String),
    totalScore,
  });
  return toPublicExam(exam);
}

export interface UpdateExamInput {
  title?: unknown;
  durationMinutes?: unknown;
  startTime?: unknown;
  status?: unknown;
}

export async function updateExam(id: string, input: UpdateExamInput) {
  const exam = await dbGetExam(id);
  if (!exam) {
    throw new AppError(404, "考试不存在");
  }

  if (input.title !== undefined) {
    if (typeof input.title !== "string" || !input.title) {
      throw new AppError(400, "title 必须是非空字符串");
    }
    exam.title = input.title;
  }
  if (input.durationMinutes !== undefined) {
    if (typeof input.durationMinutes !== "number" || input.durationMinutes <= 0) {
      throw new AppError(400, "durationMinutes 必须是正整数");
    }
    exam.durationMinutes = input.durationMinutes;
  }
  if (input.startTime !== undefined) {
    if (typeof input.startTime !== "string" || !input.startTime) {
      throw new AppError(400, "startTime 必须是非空字符串");
    }
    exam.startTime = input.startTime;
  }
  if (input.status !== undefined) {
    const next = input.status as ExamStatus;
    if (!["draft", "published", "closed"].includes(next)) {
      throw new AppError(400, "status 只能是 draft / published / closed");
    }
    if (!allowedTransitions[exam.status].includes(next)) {
      throw new AppError(
        409,
        `非法状态流转：${exam.status} → ${next}（只允许 draft→published→closed）`
      );
    }
    exam.status = next;
  }

  return toPublicExam(await dbUpdateExam(exam));
}
