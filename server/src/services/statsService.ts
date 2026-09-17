import { prisma } from "../db/client";
import type {
  ExamScoreStats,
  QuestionErrorStat,
  ScoresOverview,
} from "../types";

// 成绩统计业务。统计口径（与 /admin 首页一致）：
// - 平均分/通过率只统计 status = graded 的提交；pending_review 不计入但单独计数
// - 通过率 = graded 提交中 totalScore >= 该考试满分 60% 的比例
// - 题目错误率 = 答错次数 ÷ 作答次数（答错 = Answer.score < Question.score；
//   简答未复核 score = null 的不计入）

const PASS_RATIO = 0.6;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export async function getScoresOverview(): Promise<ScoresOverview> {
  const [publishedExams, totalSubmissions, pendingReview, allSubmissions] =
    await Promise.all([
      prisma.exam.count({ where: { status: "published" } }),
      prisma.submission.count(),
      prisma.submission.count({ where: { status: "pending_review" } }),
      prisma.submission.findMany({
        select: { studentId: true, status: true, totalScore: true, exam: { select: { totalScore: true } } },
      }),
    ]);

  const participants = new Set(allSubmissions.map((s) => s.studentId)).size;
  const graded = allSubmissions.filter(
    (s) => s.status === "graded" && s.totalScore !== null
  );

  const avgScore = graded.length
    ? round1(graded.reduce((sum, s) => sum + s.totalScore!, 0) / graded.length)
    : 0; // 无 graded 数据时返回 0
  const passed = graded.filter(
    (s) => s.totalScore! >= s.exam.totalScore * PASS_RATIO
  ).length;
  const passRate = graded.length ? round1((passed / graded.length) * 100) : 0;

  return {
    publishedExams,
    participants,
    totalSubmissions,
    pendingReview,
    avgScore,
    passRate,
  };
}

export async function getExamScoreStats(): Promise<ExamScoreStats[]> {
  // 覆盖 published / closed 的考试；无 graded 提交时统计字段为 null
  const exams = await prisma.exam.findMany({
    where: { status: { in: ["published", "closed"] } },
    orderBy: { createdAt: "asc" },
  });
  const gradedSubs = await prisma.submission.findMany({
    where: { status: "graded", totalScore: { not: null } },
    select: { examId: true, studentId: true, totalScore: true },
  });

  return exams.map((exam) => {
    const subs = gradedSubs.filter((s) => s.examId === exam.id);
    if (subs.length === 0) {
      return {
        examId: exam.id,
        title: exam.title,
        totalScore: exam.totalScore,
        participants: 0,
        avgScore: null,
        maxScore: null,
        minScore: null,
        passRate: null,
      };
    }
    const scores = subs.map((s) => s.totalScore!);
    const passed = scores.filter(
      (score) => score >= exam.totalScore * PASS_RATIO
    ).length;
    return {
      examId: exam.id,
      title: exam.title,
      totalScore: exam.totalScore,
      participants: new Set(subs.map((s) => s.studentId)).size,
      avgScore: round1(scores.reduce((a, b) => a + b, 0) / scores.length),
      maxScore: Math.max(...scores),
      minScore: Math.min(...scores),
      passRate: round1((passed / scores.length) * 100),
    };
  });
}

export async function getQuestionErrorStats(): Promise<QuestionErrorStat[]> {
  // 只统计 score 非 null 的作答
  const answers = await prisma.answer.findMany({
    where: { score: { not: null } },
    select: {
      score: true,
      question: {
        select: {
          id: true,
          stem: true,
          type: true,
          category: true,
          score: true,
        },
      },
    },
  });

  const byQuestion = new Map<string, QuestionErrorStat>();
  for (const a of answers) {
    const q = a.question;
    let stat = byQuestion.get(q.id);
    if (!stat) {
      stat = {
        questionId: q.id,
        stem: q.stem,
        type: q.type as QuestionErrorStat["type"],
        category: q.category,
        attempts: 0,
        wrongCount: 0,
        errorRate: 0,
      };
      byQuestion.set(q.id, stat);
    }
    stat.attempts += 1;
    if (a.score! < q.score) {
      stat.wrongCount += 1;
    }
  }

  return [...byQuestion.values()]
    .map((s) => ({ ...s, errorRate: round1((s.wrongCount / s.attempts) * 100) }))
    .sort(
      (a, b) =>
        b.errorRate - a.errorRate ||
        b.wrongCount - a.wrongCount ||
        b.attempts - a.attempts
    )
    .slice(0, 10);
}
