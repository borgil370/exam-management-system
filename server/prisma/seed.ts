import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

// 种子脚本：把演示数据灌入 PostgreSQL。全部用 upsert，可重复执行（幂等）。
// 运行：pnpm --filter exam-server db:seed（需要先 db:migrate 建好表）

const prisma = new PrismaClient();

const users = [
  { id: "u1", name: "李明", email: "student@example.com", role: "student" },
  { id: "u2", name: "王老师", email: "admin@example.com", role: "admin" },
];

const questions = [
  {
    id: "q1",
    type: "single_choice",
    stem: "下列哪个标签用于在 HTML 中创建超链接？",
    options: ["<link>", "<a>", "<href>", "<url>"],
    correctAnswer: "<a>",
    score: 10,
    category: "前端基础",
  },
  {
    id: "q2",
    type: "single_choice",
    stem: "CSS 中用于设置元素内边距的属性是？",
    options: ["margin", "padding", "border", "spacing"],
    correctAnswer: "padding",
    score: 10,
    category: "前端基础",
  },
  {
    id: "q3",
    type: "true_false",
    stem: "HTTP 协议是无状态的协议。",
    options: ["正确", "错误"],
    correctAnswer: "正确",
    score: 10,
    category: "计算机网络",
  },
  {
    id: "q4",
    type: "true_false",
    stem: "二分查找要求数据必须是有序的。",
    options: ["正确", "错误"],
    correctAnswer: "正确",
    score: 10,
    category: "数据结构",
  },
  {
    id: "q5",
    type: "essay",
    stem: "请简述 TCP 三次握手的过程及其作用。",
    options: null,
    correctAnswer: null,
    score: 20,
    category: "计算机网络",
  },
  {
    id: "q6",
    type: "essay",
    stem: "请说明数据库索引的作用，并举例说明适合建立索引的场景。",
    options: null,
    correctAnswer: null,
    score: 20,
    category: "数据库",
  },
];

const exams = [
  {
    id: "e1",
    title: "前端基础随堂测（纯客观题）",
    description: "HTML/CSS/JS 基础，交卷后自动出分。",
    durationMinutes: 30,
    startTime: new Date("2026-09-13T09:00:00.000Z"),
    status: "published",
    totalScore: 30,
    questionIds: ["q1", "q2", "q3"],
  },
  {
    id: "e2",
    title: "计算机网络期中测试（含简答题）",
    description: "客观题自动评分，简答题需教师复核后出分。",
    durationMinutes: 60,
    startTime: new Date("2026-09-13T10:00:00.000Z"),
    status: "published",
    totalScore: 40,
    questionIds: ["q3", "q4", "q5"],
  },
  {
    id: "e3",
    title: "数据库概论模拟考（草稿）",
    description: "尚未发布，学生不可见。",
    durationMinutes: 45,
    startTime: new Date("2026-09-20T09:00:00.000Z"),
    status: "draft",
    totalScore: 20,
    questionIds: ["q6"],
  },
];

async function main() {
  // 两个演示账号，密码均为 123456
  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      update: { name: u.name, email: u.email, role: u.role },
      create: { ...u, passwordHash: bcrypt.hashSync("123456", 10) },
    });
  }

  for (const q of questions) {
    await prisma.question.upsert({
      where: { id: q.id },
      update: {
        type: q.type,
        stem: q.stem,
        options: q.options ?? undefined,
        correctAnswer: q.correctAnswer,
        score: q.score,
        category: q.category,
      },
      create: {
        id: q.id,
        type: q.type,
        stem: q.stem,
        options: q.options ?? undefined,
        correctAnswer: q.correctAnswer,
        score: q.score,
        category: q.category,
      },
    });
  }

  for (const e of exams) {
    const { questionIds, ...examData } = e;
    await prisma.exam.upsert({
      where: { id: e.id },
      update: examData,
      create: examData,
    });
    // 考试-题目关联行（含顺序）
    for (const [index, questionId] of questionIds.entries()) {
      await prisma.examQuestion.upsert({
        where: { examId_questionId: { examId: e.id, questionId } },
        update: { sortOrder: index },
        create: { examId: e.id, questionId, sortOrder: index },
      });
    }
  }

  console.log("种子数据完成：2 个用户、6 道题、3 场考试");
}

main()
  .catch((err) => {
    console.error("种子脚本执行失败：", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
