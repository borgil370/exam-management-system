// 与 server/src/types.ts 对齐的前端类型 + 统一 fetch 封装。
// 后端所有接口（auth 除外）都返回信封 { code, message, data }：
// code === 0 表示成功，否则抛出带后端中文 message 的 Error；401 统一跳登录页。

export type QuestionType = "single_choice" | "true_false" | "essay";
export type ExamStatus = "draft" | "published" | "closed";
export type SubmissionStatus = "in_progress" | "pending_review" | "graded";

// 学生视角的题目（后端已剥离 correctAnswer）
export interface PublicQuestion {
  id: string;
  type: QuestionType;
  stem: string;
  options?: string[];
  score: number;
  category: string;
}

// 管理员视角的题目（含正确答案）
export interface Question extends PublicQuestion {
  correctAnswer?: string;
}

export interface ExamSummary {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  startTime: string;
  status: ExamStatus;
  totalScore: number;
  questionCount: number;
}

export interface ExamDetail extends ExamSummary {
  questions: PublicQuestion[];
}

// POST /api/submissions/start 的返回
export interface StartedExam {
  submissionId: string;
  status: SubmissionStatus;
  exam: {
    id: string;
    title: string;
    durationMinutes: number;
    totalScore: number;
  };
  questions: PublicQuestion[];
}

export interface SubmissionSummary {
  id: string;
  examId: string;
  examTitle: string;
  status: SubmissionStatus;
  objectiveScore: number;
  totalScore: number | null;
  submittedAt: string | null;
}

export interface AdminSubmission extends SubmissionSummary {
  studentName: string;
  startedAt: string;
}

export interface AnswerDetail {
  questionId: string;
  type: QuestionType;
  stem: string;
  questionScore: number;
  correctAnswer: string | null;
  answer: string;
  score: number | null;
}

export interface SubmissionDetail extends AdminSubmission {
  answers: AnswerDetail[];
  examTotalScore: number;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  // 未登录 / 登录失效：统一跳登录页
  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("登录已失效，请重新登录");
  }

  const body = await res.json().catch(() => null);
  if (!body || body.code !== 0) {
    throw new Error(body?.message ?? `请求失败（HTTP ${res.status}）`);
  }
  return body.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
};

export const questionTypeLabel: Record<QuestionType, string> = {
  single_choice: "单选题",
  true_false: "判断题",
  essay: "简答题",
};

export const examStatusLabel: Record<ExamStatus, string> = {
  draft: "草稿",
  published: "已发布",
  closed: "已关闭",
};

export const submissionStatusLabel: Record<SubmissionStatus, string> = {
  in_progress: "答题中",
  pending_review: "待复核",
  graded: "已出分",
};

export function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("zh-CN", { hour12: false });
}

// ---------- 成绩统计（/api/admin/scores） ----------

export interface ScoresOverview {
  publishedExams: number;
  participants: number;
  totalSubmissions: number;
  pendingReview: number;
  avgScore: number;
  passRate: number;
}

export interface ExamScoreStats {
  examId: string;
  title: string;
  totalScore: number;
  participants: number;
  avgScore: number | null;
  maxScore: number | null;
  minScore: number | null;
  passRate: number | null;
}

export interface QuestionErrorStat {
  questionId: string;
  stem: string;
  type: QuestionType;
  category: string;
  attempts: number;
  wrongCount: number;
  errorRate: number;
}
