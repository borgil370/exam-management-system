import { dbCreateQuestion, dbListQuestions } from "../db";
import { AppError } from "../middleware/error";
import type { QuestionType } from "../types";

// 题库业务规则：筛选、新增校验。不碰 req/res，出错抛 AppError。

const validTypes: QuestionType[] = ["single_choice", "true_false", "essay"];

export async function listQuestions(filter: {
  category?: string;
  type?: string;
}) {
  if (filter.type && !validTypes.includes(filter.type as QuestionType)) {
    throw new AppError(400, "type 只能是 single_choice / true_false / essay");
  }
  const questions = await dbListQuestions();
  return questions.filter((q) => {
    if (filter.category && q.category !== filter.category) return false;
    if (filter.type && q.type !== filter.type) return false;
    return true;
  });
}

export interface CreateQuestionInput {
  type?: unknown;
  stem?: unknown;
  options?: unknown;
  correctAnswer?: unknown;
  score?: unknown;
  category?: unknown;
}

export async function createQuestion(input: CreateQuestionInput) {
  if (!validTypes.includes(input.type as QuestionType)) {
    throw new AppError(400, "缺少必填字段：type（single_choice / true_false / essay）");
  }
  const type = input.type as QuestionType;

  if (!input.stem || typeof input.stem !== "string") {
    throw new AppError(400, "缺少必填字段：stem（题干）");
  }
  if (typeof input.score !== "number" || input.score <= 0) {
    throw new AppError(400, "缺少必填字段：score（正整数分值）");
  }
  if (!input.category || typeof input.category !== "string") {
    throw new AppError(400, "缺少必填字段：category（分类）");
  }

  let options: string[] | undefined;
  let correctAnswer: string | undefined;

  if (type === "single_choice") {
    if (!Array.isArray(input.options) || input.options.length < 2) {
      throw new AppError(400, "单选题必须提供 options（至少 2 个选项）");
    }
    options = input.options.map(String);
    if (!input.correctAnswer || typeof input.correctAnswer !== "string") {
      throw new AppError(400, "单选题必须提供 correctAnswer（正确答案）");
    }
    correctAnswer = input.correctAnswer;
  } else if (type === "true_false") {
    if (!input.correctAnswer || typeof input.correctAnswer !== "string") {
      throw new AppError(400, "判断题必须提供 correctAnswer（正确/错误）");
    }
    options = ["正确", "错误"];
    correctAnswer = input.correctAnswer;
  }
  // 简答题：没有 correctAnswer 和 options

  return await dbCreateQuestion({
    type,
    stem: input.stem,
    options,
    correctAnswer,
    score: input.score,
    category: input.category,
  });
}
