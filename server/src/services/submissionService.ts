import { Prisma } from "@prisma/client";
import {
  dbCreateSubmission,
  dbFindSubmission,
  dbGetExamWithQuestions,
  dbGetSubmission,
  dbListSubmissionSummaries,
  dbUpdateSubmission,
  findUserById,
} from "../db";
import { AppError } from "../middleware/error";
import type {
  AnswerRecord,
  Exam,
  Question,
  Submission,
  SubmissionStatus,
} from "../types";

// 提交/判分/复核业务规则。不碰 req/res，出错抛 AppError。
// 数据库在广域网远端，RTT 是接口耗时的主要成本：
// 查询策略是"能并行就并行、能一次查全就不逐条查"，尽量压每个接口的往返次数。

async function getExamWithQuestionsOrFail(examId: string) {
  const found = await dbGetExamWithQuestions(examId);
  if (!found) throw new AppError(404, "考试不存在");
  return found;
}

async function getSubmissionOrFail(id: string) {
  const submission = await dbGetSubmission(id);
  if (!submission) throw new AppError(404, "提交记录不存在");
  return submission;
}

// 题目信息剥离 correctAnswer，给学生答题用
function stripQuestion(q: Question) {
  return {
    id: q.id,
    type: q.type,
    stem: q.stem,
    options: q.options,
    score: q.score,
    category: q.category,
  };
}

function startResult(exam: Exam, questions: Question[], submission: Submission) {
  return {
    submissionId: submission.id,
    status: submission.status,
    exam: {
      id: exam.id,
      title: exam.title,
      durationMinutes: exam.durationMinutes,
      totalScore: exam.totalScore,
    },
    questions: questions.map(stripQuestion),
  };
}

// 开始考试：幂等（答题中直接返回原 submission），已提交过则 409
export async function startExam(studentId: string, examId: string) {
  // 两个查询互不依赖，并行发出（省一次 RTT）
  const [found, mine] = await Promise.all([
    dbGetExamWithQuestions(examId),
    dbFindSubmission(examId, studentId),
  ]);
  if (!found) throw new AppError(404, "考试不存在");
  const { exam, questions } = found;

  if (exam.status !== "published") {
    throw new AppError(409, "考试未发布或已关闭，无法开始");
  }
  if (mine?.status === "in_progress") {
    return startResult(exam, questions, mine);
  }
  if (mine) {
    throw new AppError(409, "本场考试已提交过，不能重复参加");
  }

  // 并发重复 start（如 React StrictMode 双调用、双击、多标签页）：
  // 先查后建不是原子的，第二个请求会撞上 (examId, studentId) 唯一约束，
  // 此时重新查出已创建的记录按幂等返回，而不是抛 500
  try {
    const submission = await dbCreateSubmission({
      examId,
      studentId,
      status: "in_progress",
      answers: [],
      objectiveScore: 0,
      totalScore: null,
      startedAt: new Date().toISOString(),
      submittedAt: null,
    });
    return startResult(exam, questions, submission);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const concurrent = await dbFindSubmission(examId, studentId);
      if (concurrent?.status === "in_progress") {
        return startResult(exam, questions, concurrent);
      }
      throw new AppError(409, "本场考试已提交过，不能重复参加");
    }
    throw err;
  }
}

export interface SubmitAnswerInput {
  questionId?: unknown;
  answer?: unknown;
}

// 提交试卷：客观题自动判分；含简答题 → pending_review，否则 graded 直接出分
export async function submitExam(
  studentId: string,
  submissionId: string,
  rawAnswers: SubmitAnswerInput[]
) {
  const submission = await getSubmissionOrFail(submissionId);
  if (submission.studentId !== studentId) {
    throw new AppError(403, "只能提交自己的试卷");
  }
  if (submission.status !== "in_progress") {
    throw new AppError(409, "试卷已提交过，不能重复提交");
  }
  if (!Array.isArray(rawAnswers)) {
    throw new AppError(400, "answers 必须是数组：[{ questionId, answer }]");
  }

  const { exam, questions } = await getExamWithQuestionsOrFail(
    submission.examId
  );
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const answerMap = new Map<string, string>();
  for (const item of rawAnswers) {
    if (!item?.questionId || typeof item.answer !== "string") {
      throw new AppError(400, "answers 数组元素必须包含 questionId 和 answer（字符串）");
    }
    if (!exam.questionIds.includes(String(item.questionId))) {
      throw new AppError(400, `题目 ${item.questionId} 不属于本场考试`);
    }
    answerMap.set(String(item.questionId), item.answer);
  }

  // 判分：单选/判断比对 correctAnswer；简答不打分（score = null，待复核）
  let objectiveScore = 0;
  let hasEssay = false;
  const answers: AnswerRecord[] = exam.questionIds.map((qid) => {
    const question = questionById.get(qid)!;
    const answer = answerMap.get(qid) ?? "";
    if (question.type === "essay") {
      hasEssay = true;
      return { questionId: qid, answer, score: null };
    }
    const score = answer === question.correctAnswer ? question.score : 0;
    objectiveScore += score;
    return { questionId: qid, answer, score };
  });

  submission.answers = answers;
  submission.objectiveScore = objectiveScore;
  submission.submittedAt = new Date().toISOString();
  if (hasEssay) {
    submission.status = "pending_review";
    submission.totalScore = null;
  } else {
    submission.status = "graded";
    submission.totalScore = objectiveScore;
  }
  await dbUpdateSubmission(submission);

  return {
    id: submission.id,
    examId: submission.examId,
    examTitle: exam.title,
    status: submission.status,
    objectiveScore: submission.objectiveScore,
    totalScore: submission.totalScore,
    submittedAt: submission.submittedAt,
  };
}

// 学生历史成绩：自己所有已提交的记录
export async function getStudentHistory(studentId: string) {
  const rows = await dbListSubmissionSummaries({
    studentId,
    excludeStatus: "in_progress",
  });
  return rows.map((r) => ({
    id: r.id,
    examId: r.examId,
    examTitle: r.examTitle,
    status: r.status,
    objectiveScore: r.objectiveScore,
    totalScore: r.totalScore,
    submittedAt: r.submittedAt,
  }));
}

// 管理员查看全部提交，支持 examId / status 筛选
export async function listSubmissions(filter: {
  examId?: string;
  status?: string;
}) {
  const validStatus: SubmissionStatus[] = ["in_progress", "pending_review", "graded"];
  if (filter.status && !validStatus.includes(filter.status as SubmissionStatus)) {
    throw new AppError(400, "status 只能是 in_progress / pending_review / graded");
  }
  const rows = await dbListSubmissionSummaries({
    examId: filter.examId,
    status: filter.status,
  });
  return rows.map((r) => ({
    id: r.id,
    examId: r.examId,
    examTitle: r.examTitle,
    status: r.status,
    objectiveScore: r.objectiveScore,
    totalScore: r.totalScore,
    submittedAt: r.submittedAt,
    studentName: r.studentName,
    startedAt: r.startedAt,
  }));
}

// 管理员查看提交详情：含每题作答明细
export async function getSubmissionDetail(id: string) {
  const submission = await getSubmissionOrFail(id);
  // 考试（含题目）与学生姓名互不依赖，并行发出
  const [{ exam, questions }, student] = await Promise.all([
    getExamWithQuestionsOrFail(submission.examId),
    findUserById(submission.studentId),
  ]);
  const questionById = new Map(questions.map((q) => [q.id, q]));
  return {
    id: submission.id,
    examId: submission.examId,
    examTitle: exam.title,
    status: submission.status,
    objectiveScore: submission.objectiveScore,
    totalScore: submission.totalScore,
    submittedAt: submission.submittedAt,
    studentName: student?.name ?? submission.studentId,
    startedAt: submission.startedAt,
    answers: submission.answers.map((a) => {
      const question = questionById.get(a.questionId)!;
      return {
        questionId: a.questionId,
        type: question.type,
        stem: question.stem,
        questionScore: question.score,
        correctAnswer: question.correctAnswer ?? null,
        answer: a.answer,
        score: a.score,
      };
    }),
    examTotalScore: exam.totalScore,
  };
}

export interface ReviewInput {
  questionId?: unknown;
  score?: unknown;
}

// 人工复核：给简答题打分，全部简答题复核完后出总分
export async function reviewSubmission(id: string, reviews: ReviewInput[]) {
  const submission = await getSubmissionOrFail(id);
  if (submission.status !== "pending_review") {
    throw new AppError(409, "只有待复核（pending_review）的提交才能复核");
  }
  if (!Array.isArray(reviews) || reviews.length === 0) {
    throw new AppError(400, "reviews 必须是非空数组：[{ questionId, score }]");
  }

  const { exam, questions } = await getExamWithQuestionsOrFail(
    submission.examId
  );
  const questionById = new Map(questions.map((q) => [q.id, q]));

  const essayAnswers: AnswerRecord[] = submission.answers.filter(
    (a) => questionById.get(a.questionId)?.type === "essay"
  );

  const reviewMap = new Map<string, number>();
  for (const r of reviews) {
    const questionId = String(r.questionId ?? "");
    const answerRecord = essayAnswers.find((a) => a.questionId === questionId);
    if (!answerRecord) {
      throw new AppError(400, `题目 ${questionId} 不是本次提交的简答题`);
    }
    if (typeof r.score !== "number" || r.score < 0) {
      throw new AppError(400, `题目 ${questionId} 的复核分数必须是不小于 0 的数字`);
    }
    const question = questionById.get(questionId)!;
    if (r.score > question.score) {
      throw new AppError(
        400,
        `题目 ${questionId} 的复核分数（${r.score}）超过该题分值（${question.score}）`
      );
    }
    reviewMap.set(questionId, r.score);
  }

  // 所有简答题都必须给出复核分，否则无法出总分
  const missing = essayAnswers.filter((a) => !reviewMap.has(a.questionId));
  if (missing.length > 0) {
    throw new AppError(
      400,
      `还有简答题未复核：${missing.map((a) => a.questionId).join("、")}`
    );
  }

  for (const a of submission.answers) {
    if (reviewMap.has(a.questionId)) {
      a.score = reviewMap.get(a.questionId)!;
    }
  }
  const essayScore = [...reviewMap.values()].reduce((sum, s) => sum + s, 0);
  submission.totalScore = submission.objectiveScore + essayScore;
  submission.status = "graded";
  await dbUpdateSubmission(submission);

  return {
    id: submission.id,
    examId: submission.examId,
    examTitle: exam.title,
    status: submission.status,
    objectiveScore: submission.objectiveScore,
    totalScore: submission.totalScore,
    submittedAt: submission.submittedAt,
  };
}
