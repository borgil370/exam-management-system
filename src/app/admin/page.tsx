"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpenCheck,
  ClipboardList,
  FileCheck2,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  api,
  formatTime,
  submissionStatusLabel,
  type AdminSubmission,
  type ExamSummary,
} from "@/lib/api";

export default function AdminDashboardPage() {
  const [exams, setExams] = useState<ExamSummary[] | null>(null);
  const [submissions, setSubmissions] = useState<AdminSubmission[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<ExamSummary[]>("/api/admin/exams"),
      api.get<AdminSubmission[]>("/api/admin/submissions"),
    ])
      .then(([e, s]) => {
        setExams(e);
        setSubmissions(s);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  if (error) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </p>
    );
  }
  if (!exams || !submissions) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">加载中…</p>
    );
  }

  const graded = submissions.filter(
    (s) => s.status === "graded" && s.totalScore !== null
  );
  const pending = submissions.filter((s) => s.status === "pending_review");
  const avgScore = graded.length
    ? Math.round(
        graded.reduce((sum, s) => sum + (s.totalScore ?? 0), 0) / graded.length
      )
    : 0;

  const stats = [
    { label: "考试总数", value: exams.length, icon: ClipboardList },
    { label: "学生提交数", value: submissions.length, icon: BookOpenCheck },
    { label: "待批改数", value: pending.length, icon: FileCheck2 },
    { label: "平均分（已评阅）", value: avgScore, icon: TrendingUp },
  ];

  const recent = [...submissions]
    .sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""))
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>{s.label}</CardDescription>
              <s.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>最近提交</CardTitle>
            <CardDescription>最新 4 条学生提交记录</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                暂无提交记录
              </p>
            )}
            {recent.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.studentName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.examTitle} · {formatTime(s.submittedAt)}
                  </p>
                </div>
                <Badge variant={s.status === "graded" ? "default" : "secondary"}>
                  {submissionStatusLabel[s.status]}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>待复核</CardTitle>
              <CardDescription>需要人工复核的提交</CardDescription>
            </div>
            <Link
              href="/admin/submissions"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              前往处理
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                暂无待复核的提交
              </p>
            )}
            {pending.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.studentName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.examTitle} · {formatTime(s.submittedAt)}
                  </p>
                </div>
                <Badge variant="secondary">待复核</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
