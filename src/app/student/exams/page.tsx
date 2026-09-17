"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, Clock, Target, FileQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api, formatTime, type ExamSummary } from "@/lib/api";

export default function StudentExamsPage() {
  const [exams, setExams] = useState<ExamSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<ExamSummary[]>("/api/exams")
      .then(setExams)
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">我的考试</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          已发布的考试都可以进入作答；已开始但未交卷的考试会自动继续。
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {!error && exams === null && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          加载中…
        </p>
      )}
      {!error && exams !== null && exams.length === 0 && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          暂无已发布的考试
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {(exams ?? []).map((exam) => (
          <Card key={exam.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{exam.title}</CardTitle>
                <Badge>可参加</Badge>
              </div>
              <CardDescription>{exam.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarClock className="size-4 shrink-0" />
                开考时间：{formatTime(exam.startTime)}
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4" />
                  {exam.durationMinutes} 分钟
                </span>
                <span className="flex items-center gap-1.5">
                  <Target className="size-4" />
                  满分 {exam.totalScore} 分
                </span>
                <span className="flex items-center gap-1.5">
                  <FileQuestion className="size-4" />
                  {exam.questionCount} 题
                </span>
              </div>
            </CardContent>
            <CardFooter>
              <Link
                href={`/student/exams/${exam.id}`}
                className={buttonVariants({ className: "w-full" })}
              >
                进入考试
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
