// 全局共享的类型定义（各层统一从这里 import，避免重复定义）

export type Role = "student" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  passwordHash: string;
}

export type QuestionType = "single_choice" | "true_false" | "essay";

export interface Question {
  id: string;
  type: QuestionType;
  stem: string;
  options?: string[];
  correctAnswer?: string; // 简答题没有
  score: number;
  category: string;
}

export type ExamStatus = "draft" | "published" | "closed";

export interface Exam {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  startTime: string;
  status: ExamStatus;
  questionIds: string[];
  totalScore: number;
}

// in_progress: 答题中；pending_review: 已提交、待人工复核简答题；graded: 已出分
export type SubmissionStatus = "in_progress" | "pending_review" | "graded";

// 每题作答明细；score 为 null 表示该题（简答）尚未复核打分
export interface AnswerRecord {
  questionId: string;
  answer: string;
  score: number | null;
}

export interface Submission {
  id: string;
  examId: string;
  studentId: string;
  status: SubmissionStatus;
  answers: AnswerRecord[];
  objectiveScore: number; // 客观题（单选/判断）合计得分
  totalScore: number | null; // graded 后才有值
  startedAt: string;
  submittedAt: string | null;
}

// ---------- 成绩统计（/api/admin/scores） ----------

// 总览：平均分/通过率只统计 graded；pending_review 不计入但单独计数
export interface ScoresOverview {
  publishedExams: number; // 已发布考试数
  participants: number; // 有提交记录的去重学生数
  totalSubmissions: number; // 提交记录总数（全部状态）
  pendingReview: number; // 待复核数
  avgScore: number; // graded 的 totalScore 平均；无 graded 时为 0
  passRate: number; // graded 中 totalScore >= 考试满分 60% 的比例（0-100）；无 graded 时为 0
}

// 每场考试统计：覆盖 published/closed 考试；无 graded 提交时统计字段为 null
export interface ExamScoreStats {
  examId: string;
  title: string;
  totalScore: number;
  participants: number; // 有 graded 提交的去重学生数
  avgScore: number | null;
  maxScore: number | null;
  minScore: number | null;
  passRate: number | null;
}

// 题目错误率：只统计 score 非 null 的作答；答错 = score < 题目分值
export interface QuestionErrorStat {
  questionId: string;
  stem: string;
  type: QuestionType;
  category: string;
  attempts: number; // 作答次数（score 非 null）
  wrongCount: number;
  errorRate: number; // 0-100
}
