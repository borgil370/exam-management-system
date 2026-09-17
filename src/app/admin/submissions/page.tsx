"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  formatTime,
  questionTypeLabel,
  submissionStatusLabel,
  type AdminSubmission,
  type SubmissionDetail,
} from "@/lib/api";

export default function AdminSubmissionsPage() {
  const [list, setList] = useState<AdminSubmission[] | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageError, setPageError] = useState("");

  const [detail, setDetail] = useState<SubmissionDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reviewScores, setReviewScores] = useState<Record<string, string>>({});
  const [dialogError, setDialogError] = useState("");
  const [saving, setSaving] = useState(false);

  const loadList = useCallback(() => {
    const query = statusFilter !== "all" ? `?status=${statusFilter}` : "";
    api
      .get<AdminSubmission[]>(`/api/admin/submissions${query}`)
      .then(setList)
      .catch((e: Error) => setPageError(e.message));
  }, [statusFilter]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // 打开详情：拉取含每题作答明细的数据
  function openDetail(id: string) {
    setDialogError("");
    setReviewScores({});
    setDetail(null);
    setDetailOpen(true);
    api
      .get<SubmissionDetail>(`/api/admin/submissions/${id}`)
      .then(setDetail)
      .catch((e: Error) => setDialogError(e.message));
  }

  // 提交复核：把每道简答题的打分组装成 reviews 发给后端
  function handleReview() {
    if (!detail) return;
    const essayAnswers = detail.answers.filter((a) => a.type === "essay");
    const reviews = essayAnswers.map((a) => ({
      questionId: a.questionId,
      score: Number(reviewScores[a.questionId] ?? NaN),
    }));
    if (reviews.some((r) => Number.isNaN(r.score) || r.score < 0)) {
      setDialogError("请为每道简答题填写不小于 0 的分数");
      return;
    }
    setSaving(true);
    setDialogError("");
    api
      .patch(`/api/admin/submissions/${detail.id}/review`, { reviews })
      .then(() => {
        setDetailOpen(false);
        loadList();
      })
      .catch((e: Error) => setDialogError(e.message)) // 超分/缺题等后端 message
      .finally(() => setSaving(false));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          共 {list?.length ?? "…"} 条提交记录
        </p>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as string)}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="in_progress">答题中</SelectItem>
            <SelectItem value="pending_review">待复核</SelectItem>
            <SelectItem value="graded">已评阅</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {pageError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {pageError}
        </p>
      )}

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>学生</TableHead>
                <TableHead>考试</TableHead>
                <TableHead>提交时间</TableHead>
                <TableHead>得分</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(list ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {s.studentName}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {s.examTitle}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatTime(s.submittedAt)}
                  </TableCell>
                  <TableCell>
                    {s.totalScore !== null ? s.totalScore : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        s.status === "graded"
                          ? "default"
                          : s.status === "pending_review"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {submissionStatusLabel[s.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDetail(s.id)}
                    >
                      {s.status === "pending_review" ? "复核 / 详情" : "查看详情"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {list !== null && list.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    暂无提交记录
                  </TableCell>
                </TableRow>
              )}
              {list === null && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    加载中…
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>提交详情</DialogTitle>
            <DialogDescription>
              {detail
                ? `${detail.studentName} · ${detail.examTitle} · 满分 ${detail.examTotalScore} 分`
                : "加载中…"}
            </DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>客观题得分：{detail.objectiveScore}</span>
                <span>
                  总分：{detail.totalScore !== null ? detail.totalScore : "未出分"}
                </span>
                <span>状态：{submissionStatusLabel[detail.status]}</span>
                <span>提交时间：{formatTime(detail.submittedAt)}</span>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-48">题目</TableHead>
                      <TableHead>学生作答</TableHead>
                      <TableHead>正确答案</TableHead>
                      <TableHead>得分</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detail.answers.map((a) => (
                      <TableRow key={a.questionId}>
                        <TableCell>
                          <p className="max-w-56 truncate text-sm">{a.stem}</p>
                          <p className="text-xs text-muted-foreground">
                            {questionTypeLabel[a.type]} · {a.questionScore} 分
                          </p>
                        </TableCell>
                        <TableCell className="max-w-40 truncate text-sm">
                          {a.answer || "（未作答）"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {a.correctAnswer ?? "—"}
                        </TableCell>
                        <TableCell>
                          {a.type === "essay" &&
                          detail.status === "pending_review" ? (
                            <Input
                              type="number"
                              min={0}
                              max={a.questionScore}
                              placeholder={`0-${a.questionScore}`}
                              className="w-24"
                              value={reviewScores[a.questionId] ?? ""}
                              onChange={(e) =>
                                setReviewScores((prev) => ({
                                  ...prev,
                                  [a.questionId]: e.target.value,
                                }))
                              }
                            />
                          ) : (
                            (a.score ?? "待复核")
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {dialogError && (
            <p className="text-sm text-destructive">{dialogError}</p>
          )}
          {detail?.status === "pending_review" && (
            <DialogFooter>
              <Button onClick={handleReview} disabled={saving}>
                {saving ? "提交中…" : "提交复核"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
