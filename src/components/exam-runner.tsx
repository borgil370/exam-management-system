"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  api,
  questionTypeLabel,
  type StartedExam,
  type SubmissionSummary,
} from "@/lib/api";
import { cn } from "@/lib/utils";

function formatSeconds(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function ExamRunner({ examId }: { examId: string }) {
  // loading：正在 start；taking：答题中；result：已交卷；unavailable：无法参加（已考过/未发布/不存在）
  const [stage, setStage] = useState<"loading" | "taking" | "result" | "unavailable">("loading");
  const [startData, setStartData] = useState<StartedExam | null>(null);
  const [result, setResult] = useState<SubmissionSummary | null>(null);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 进入页面即调用 start：拿到 submissionId、时长和题目（已剥离答案）
  useEffect(() => {
    api
      .post<StartedExam>("/api/submissions/start", { examId })
      .then((data) => {
        setStartData(data);
        setSecondsLeft(data.exam.durationMinutes * 60);
        setStage("taking");
      })
      .catch((e: Error) => {
        setError(e.message);
        setStage("unavailable");
      });
  }, [examId]);

  const questions = useMemo(() => startData?.questions ?? [], [startData]);
  const answeredCount = useMemo(
    () =>
      questions.filter((q) => (answers[q.id] ?? "").trim().length > 0).length,
    [answers, questions]
  );
  const progress = questions.length
    ? Math.round((answeredCount / questions.length) * 100)
    : 0;

  // 倒计时，归零自动交卷
  useEffect(() => {
    if (stage !== "taking") return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          doSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function doSubmit() {
    if (!startData || submitting) return;
    setSubmitting(true);
    const payload = questions.map((q) => ({
      questionId: q.id,
      answer: answers[q.id] ?? "",
    }));
    api
      .post<SubmissionSummary>(
        `/api/submissions/${startData.submissionId}/submit`,
        { answers: payload }
      )
      .then((r) => {
        setResult(r);
        setStage("result");
      })
      .catch((e: Error) => {
        setError(e.message);
        setStage("unavailable");
      })
      .finally(() => setSubmitting(false));
  }

  if (stage === "loading") {
    return (
      <p className="py-24 text-center text-sm text-muted-foreground">
        正在进入考试…
      </p>
    );
  }

  if (stage === "unavailable") {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="size-14 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-bold">无法进入考试</h1>
        <p className="mt-2 text-muted-foreground">{error}</p>
        <div className="mt-6 flex gap-3">
          <Link href="/student/exams" className={buttonVariants()}>
            返回考试列表
          </Link>
          <Link
            href="/student/history"
            className={buttonVariants({ variant: "outline" })}
          >
            查看历史成绩
          </Link>
        </div>
      </div>
    );
  }

  if (stage === "result" && result) {
    const graded = result.status === "graded";
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <CheckCircle2 className="size-14 text-green-500" />
        <h1 className="mt-4 text-2xl font-bold">试卷提交成功</h1>
        {graded ? (
          <p className="mt-2 text-muted-foreground">
            「{result.examTitle}」成绩已出：
            <span className="text-xl font-bold text-foreground">
              {result.totalScore}
            </span>{" "}
            分
          </p>
        ) : (
          <p className="mt-2 text-muted-foreground">
            客观题已出分（{result.objectiveScore} 分），简答题待教师复核后公布总分。
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <Link href="/student/history" className={buttonVariants()}>
            查看历史成绩
          </Link>
          <Link
            href="/student/exams"
            className={buttonVariants({ variant: "outline" })}
          >
            返回考试列表
          </Link>
        </div>
      </div>
    );
  }

  if (!startData) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{startData.exam.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {questions.length} 题 · 满分 {startData.exam.totalScore} 分
          </p>
        </div>
        <Badge
          variant={secondsLeft < 300 ? "destructive" : "secondary"}
          className="h-8 gap-1.5 px-3 text-sm"
        >
          <Timer className="size-4" />
          剩余 {formatSeconds(secondsLeft)}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
        <div className="space-y-4">
          {questions.map((q, index) => (
            <Card key={q.id} id={`q-${q.id}`} className="scroll-mt-20">
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    {index + 1}. {q.stem}
                  </CardTitle>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="outline">{questionTypeLabel[q.type]}</Badge>
                    <Badge variant="secondary">{q.score} 分</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {q.type === "essay" ? (
                  <Textarea
                    placeholder="请在此输入你的答案…"
                    rows={5}
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                  />
                ) : (
                  <RadioGroup
                    value={answers[q.id] ?? ""}
                    onValueChange={(value) => setAnswer(q.id, value as string)}
                  >
                    {(q.options ?? []).map((opt) => (
                      <label
                        key={opt}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted",
                          answers[q.id] === opt && "border-primary bg-primary/5"
                        )}
                      >
                        <RadioGroupItem value={opt} />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </RadioGroup>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">答题进度</CardTitle>
              <CardDescription>
                已作答 {answeredCount}/{questions.length}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progress} />
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, index) => {
                  const answered = (answers[q.id] ?? "").trim().length > 0;
                  return (
                    <a
                      key={q.id}
                      href={`#q-${q.id}`}
                      className={cn(
                        buttonVariants({
                          variant: answered ? "default" : "outline",
                          size: "sm",
                        }),
                        "px-0"
                      )}
                    >
                      {index + 1}
                    </a>
                  );
                })}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                disabled={submitting}
                onClick={() => setConfirmOpen(true)}
              >
                {submitting ? "提交中…" : "提交试卷"}
              </Button>
            </CardFooter>
          </Card>
        </aside>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认提交试卷？</DialogTitle>
            <DialogDescription>
              已作答 {answeredCount}/{questions.length} 题
              {answeredCount < questions.length &&
                `，还有 ${questions.length - answeredCount} 题未作答`}
              。提交后不可修改。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose className={buttonVariants({ variant: "outline" })}>
              再检查一下
            </DialogClose>
            <Button
              onClick={() => {
                setConfirmOpen(false);
                doSubmit();
              }}
            >
              确认提交
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
