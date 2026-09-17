import { Prisma } from "@prisma/client";
import { prisma } from "./client";
import type { Exam, Question, Submission, User } from "../types";

/**
 * 数据访问层（db）：PostgreSQL 实现，经 Prisma 访问。
 * 只提供纯粹的增删改查函数，不包含任何业务规则（校验、状态流转都在 service 层）。
 * 函数签名与之前的内存实现保持一致（全部改为 async），service 层无需感知存储差异。
 */

// Prisma 查询结果（含关联）的形状
type ExamWithQuestions = Prisma.ExamGetPayload<{
  include: { questions: true };
}>;
type SubmissionWithAnswers = Prisma.SubmissionGetPayload<{
  include: { answers: true };
}>;

// ---------- Prisma 行 → 上层类型的映射 ----------

function toUser(u: Prisma.UserGetPayload<object>): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as User["role"],
    passwordHash: u.passwordHash,
  };
}

function toQuestion(q: Prisma.QuestionGetPayload<object>): Question {
  return {
    id: q.id,
    type: q.type as Question["type"],
    stem: q.stem,
    options: q.options === null ? undefined : (q.options as string[]),
    correctAnswer: q.correctAnswer ?? undefined,
    score: q.score,
    category: q.category,
  };
}

// Exam.questionIds 来自 ExamQuestion 关联行（查询时已按 sortOrder 排序）
function toExam(e: ExamWithQuestions): Exam {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    durationMinutes: e.durationMinutes,
    startTime: e.startTime.toISOString(),
    status: e.status as Exam["status"],
    questionIds: e.questions.map((r) => r.questionId),
    totalScore: e.totalScore,
  };
}

// Submission.answers 来自 Answer 关联行
function toSubmission(s: SubmissionWithAnswers): Submission {
  return {
    id: s.id,
    examId: s.examId,
    studentId: s.studentId,
    status: s.status as Submission["status"],
    answers: s.answers.map((a) => ({
      questionId: a.questionId,
      answer: a.answer,
      score: a.score,
    })),
    objectiveScore: s.objectiveScore,
    totalScore: s.totalScore,
    startedAt: s.startedAt.toISOString(),
    submittedAt: s.submittedAt?.toISOString() ?? null,
  };
}

const examInclude = {
  questions: { orderBy: { sortOrder: "asc" as const } },
};

// ---------- 用户 ----------

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const u = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  return u ? toUser(u) : undefined;
}

export async function findUserById(id: string): Promise<User | undefined> {
  const u = await prisma.user.findUnique({ where: { id } });
  return u ? toUser(u) : undefined;
}

// ---------- 题目 ----------

export async function dbListQuestions(): Promise<Question[]> {
  const rows = await prisma.question.findMany({
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toQuestion);
}

export async function dbGetQuestion(id: string): Promise<Question | undefined> {
  const q = await prisma.question.findUnique({ where: { id } });
  return q ? toQuestion(q) : undefined;
}

// 按 id 批量查题：一条 IN 查询，替代逐题 findUnique 的 N 次往返
export async function dbGetQuestionsByIds(ids: string[]): Promise<Question[]> {
  const rows = await prisma.question.findMany({ where: { id: { in: ids } } });
  return rows.map(toQuestion);
}

export async function dbCreateQuestion(
  data: Omit<Question, "id">
): Promise<Question> {
  const q = await prisma.question.create({
    data: {
      type: data.type,
      stem: data.stem,
      options: data.options,
      correctAnswer: data.correctAnswer,
      score: data.score,
      category: data.category,
    },
  });
  return toQuestion(q);
}

// ---------- 考试 ----------

export async function dbListExams(): Promise<Exam[]> {
  const rows = await prisma.exam.findMany({
    include: examInclude,
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toExam);
}

export async function dbGetExam(id: string): Promise<Exam | undefined> {
  const e = await prisma.exam.findUnique({ where: { id }, include: examInclude });
  return e ? toExam(e) : undefined;
}

// 一次查询取考试 + 全部题目明细，替代"查考试 + 逐题查"的 N+1
export async function dbGetExamWithQuestions(
  id: string
): Promise<{ exam: Exam; questions: Question[] } | undefined> {
  const e = await prisma.exam.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { sortOrder: "asc" }, include: { question: true } },
    },
  });
  if (!e) return undefined;
  return { exam: toExam(e), questions: e.questions.map((r) => toQuestion(r.question)) };
}

export async function dbCreateExam(data: Omit<Exam, "id">): Promise<Exam> {
  const e = await prisma.exam.create({
    data: {
      title: data.title,
      description: data.description,
      durationMinutes: data.durationMinutes,
      startTime: new Date(data.startTime),
      status: data.status,
      totalScore: data.totalScore,
      // 按 questionIds 数组顺序写 sortOrder，保证题目顺序
      questions: {
        create: data.questionIds.map((questionId, index) => ({
          questionId,
          sortOrder: index,
        })),
      },
    },
    include: examInclude,
  });
  return toExam(e);
}

// 只更新考试标量字段（service 层不会用它修改题目列表）
export async function dbUpdateExam(exam: Exam): Promise<Exam> {
  const e = await prisma.exam.update({
    where: { id: exam.id },
    data: {
      title: exam.title,
      description: exam.description,
      durationMinutes: exam.durationMinutes,
      startTime: new Date(exam.startTime),
      status: exam.status,
      totalScore: exam.totalScore,
    },
    include: examInclude,
  });
  return toExam(e);
}

// ---------- 提交记录 ----------

export async function dbCreateSubmission(
  data: Omit<Submission, "id">
): Promise<Submission> {
  const s = await prisma.submission.create({
    data: {
      examId: data.examId,
      studentId: data.studentId,
      status: data.status,
      objectiveScore: data.objectiveScore,
      totalScore: data.totalScore,
      submittedAt: null,
    },
    include: { answers: true },
  });
  return toSubmission(s);
}

export async function dbGetSubmission(
  id: string
): Promise<Submission | undefined> {
  const s = await prisma.submission.findUnique({
    where: { id },
    include: { answers: true },
  });
  return s ? toSubmission(s) : undefined;
}

// 按 (examId, studentId) 唯一约束直查一条，替代全表扫描后 JS 过滤
export async function dbFindSubmission(
  examId: string,
  studentId: string
): Promise<Submission | undefined> {
  const s = await prisma.submission.findUnique({
    where: { examId_studentId: { examId, studentId } },
    include: { answers: true },
  });
  return s ? toSubmission(s) : undefined;
}

export interface SubmissionFilter {
  examId?: string;
  studentId?: string;
  status?: string;
  excludeStatus?: string;
}

// 列表/历史用的摘要查询：过滤在 SQL 完成（不再全表拉回 JS 过滤），
// 考试标题、学生姓名用 include 一次带出，消除逐条查询的 N+1
export async function dbListSubmissionSummaries(filter: SubmissionFilter) {
  const rows = await prisma.submission.findMany({
    where: {
      examId: filter.examId,
      studentId: filter.studentId,
      status: filter.status,
      NOT: filter.excludeStatus ? { status: filter.excludeStatus } : undefined,
    },
    include: {
      exam: { select: { title: true } },
      student: { select: { name: true } },
    },
    orderBy: { startedAt: "asc" },
  });
  return rows.map((s) => ({
    id: s.id,
    examId: s.examId,
    status: s.status as Submission["status"],
    objectiveScore: s.objectiveScore,
    totalScore: s.totalScore,
    startedAt: s.startedAt.toISOString(),
    submittedAt: s.submittedAt?.toISOString() ?? null,
    examTitle: s.exam.title,
    studentName: s.student.name,
  }));
}

// 更新标量字段 + 整体替换作答明细（service 在提交/复核时会重写 answers）
export async function dbUpdateSubmission(
  submission: Submission
): Promise<Submission> {
  const s = await prisma.submission.update({
    where: { id: submission.id },
    data: {
      status: submission.status,
      objectiveScore: submission.objectiveScore,
      totalScore: submission.totalScore,
      submittedAt: submission.submittedAt
        ? new Date(submission.submittedAt)
        : null,
      answers: {
        deleteMany: {},
        create: submission.answers.map((a) => ({
          questionId: a.questionId,
          answer: a.answer,
          score: a.score,
        })),
      },
    },
    include: { answers: true },
  });
  return toSubmission(s);
}
