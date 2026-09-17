"use client";

import { useEffect, useState } from "react";
import {
  BookOpenCheck,
  ClipboardList,
  FileCheck2,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  api,
  questionTypeLabel,
  type ExamScoreStats,
  type QuestionErrorStat,
  type ScoresOverview,
} from "@/lib/api";

export default function AdminScoresPage() {
  const [overview, setOverview] = useState<ScoresOverview | null>(null);
  const [exams, setExams] = useState<ExamScoreStats[] | null>(null);
  const [questions, setQuestions] = useState<QuestionErrorStat[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get<ScoresOverview>("/api/admin/scores/overview"),
      api.get<ExamScoreStats[]>("/api/admin/scores/exams"),
      api.get<QuestionErrorStat[]>("/api/admin/scores/questions"),
    ])
      .then(([o, e, q]) => {
        setOverview(o);
        setExams(e);
        setQuestions(q);
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
  if (!overview || !exams || !questions) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">加载中…</p>
    );
  }

  const cards = [
    { label: "已发布考试", value: overview.publishedExams, icon: ClipboardList },
    { label: "参考人数", value: overview.participants, icon: Users },
    { label: "提交总数", value: overview.totalSubmissions, icon: BookOpenCheck },
    { label: "待复核", value: overview.pendingReview, icon: FileCheck2 },
    { label: "平均分（已评阅）", value: overview.avgScore, icon: TrendingUp },
    { label: "通过率", value: `${overview.passRate}%`, icon: Trophy },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center justify-between gap-2 p-4">
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="mt-1 text-2xl font-bold">{c.value}</p>
              </div>
              <c.icon className="size-5 shrink-0 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>考试</TableHead>
                <TableHead>满分</TableHead>
                <TableHead>参考人数</TableHead>
                <TableHead>平均分</TableHead>
                <TableHead>最高分</TableHead>
                <TableHead>最低分</TableHead>
                <TableHead>通过率</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.map((e) => (
                <TableRow key={e.examId}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {e.title}
                  </TableCell>
                  <TableCell>{e.totalScore}</TableCell>
                  <TableCell>{e.participants}</TableCell>
                  {e.avgScore === null ? (
                    <TableCell colSpan={4} className="text-muted-foreground">
                      暂无已评阅的提交
                    </TableCell>
                  ) : (
                    <>
                      <TableCell>{e.avgScore}</TableCell>
                      <TableCell>{e.maxScore}</TableCell>
                      <TableCell>{e.minScore}</TableCell>
                      <TableCell>{e.passRate}%</TableCell>
                    </>
                  )}
                </TableRow>
              ))}
              {exams.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-muted-foreground"
                  >
                    暂无已发布或已关闭的考试
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-64">题目（错误率 Top10）</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>作答次数</TableHead>
                <TableHead>答错次数</TableHead>
                <TableHead className="min-w-40">错误率</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {questions.map((q) => (
                <TableRow key={q.questionId}>
                  <TableCell className="max-w-md truncate font-medium">
                    {q.stem}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{questionTypeLabel[q.type]}</Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {q.category}
                  </TableCell>
                  <TableCell>{q.attempts}</TableCell>
                  <TableCell>{q.wrongCount}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-destructive"
                          style={{ width: `${q.errorRate}%` }}
                        />
                      </div>
                      <span className="text-sm">{q.errorRate.toFixed(1)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {questions.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    暂无作答数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
