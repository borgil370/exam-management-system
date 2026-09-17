"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { DateTimePicker } from "@/components/datetime-picker";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  api,
  examStatusLabel,
  formatTime,
  questionTypeLabel,
  type ExamStatus,
  type ExamSummary,
  type Question,
} from "@/lib/api";

const statusVariant: Record<ExamStatus, "default" | "secondary" | "outline"> = {
  draft: "outline",
  published: "default",
  closed: "secondary",
};

export default function AdminExamsPage() {
  const [examList, setExamList] = useState<ExamSummary[] | null>(null);
  const [pageError, setPageError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("60");
  const [startTime, setStartTime] = useState("");
  const [description, setDescription] = useState("");
  const [bank, setBank] = useState<Question[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dialogError, setDialogError] = useState("");
  const [saving, setSaving] = useState(false);

  function loadExams() {
    api
      .get<ExamSummary[]>("/api/admin/exams")
      .then(setExamList)
      .catch((e: Error) => setPageError(e.message));
  }

  useEffect(loadExams, []);

  // 打开创建对话框时拉题库，供勾选题目
  function openCreate() {
    setDialogError("");
    api
      .get<Question[]>("/api/admin/questions")
      .then(setBank)
      .catch((e: Error) => setDialogError(e.message));
    setCreateOpen(true);
  }

  function toggleQuestion(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  const selectedScore = bank
    .filter((q) => selectedIds.includes(q.id))
    .reduce((sum, q) => sum + q.score, 0);

  function updateStatus(id: string, status: ExamStatus) {
    setPageError("");
    api
      .patch<ExamSummary>(`/api/admin/exams/${id}`, { status })
      .then(() => loadExams())
      .catch((e: Error) => setPageError(e.message)); // 非法流转的 409 message 展示在这里
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setDialogError("");
    api
      .post<ExamSummary>("/api/admin/exams", {
        title,
        description,
        durationMinutes: Number(duration),
        startTime: startTime ? new Date(startTime).toISOString() : "",
        questionIds: selectedIds,
      })
      .then(() => {
        setCreateOpen(false);
        setTitle("");
        setDuration("60");
        setStartTime("");
        setDescription("");
        setSelectedIds([]);
        loadExams();
      })
      .catch((e: Error) => setDialogError(e.message))
      .finally(() => setSaving(false));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          共 {examList?.length ?? "…"} 场考试
        </p>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          创建考试
        </Button>
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
                <TableHead>标题</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>开始时间</TableHead>
                <TableHead>时长</TableHead>
                <TableHead>题目数</TableHead>
                <TableHead>总分</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(examList ?? []).map((exam) => (
                <TableRow key={exam.id}>
                  <TableCell className="font-medium whitespace-nowrap">
                    {exam.title}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[exam.status]}>
                      {examStatusLabel[exam.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatTime(exam.startTime)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {exam.durationMinutes} 分钟
                  </TableCell>
                  <TableCell>{exam.questionCount}</TableCell>
                  <TableCell>{exam.totalScore}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {exam.status === "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(exam.id, "published")}
                      >
                        发布
                      </Button>
                    )}
                    {exam.status === "published" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateStatus(exam.id, "closed")}
                      >
                        关闭
                      </Button>
                    )}
                    {exam.status === "closed" && (
                      <Button size="sm" variant="ghost" disabled>
                        已关闭
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {examList === null && (
                <TableRow>
                  <TableCell
                    colSpan={7}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>创建考试</DialogTitle>
            <DialogDescription>
              填写基本信息并从题库勾选题目，总分由所选题目分值自动合计。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exam-title">考试标题</Label>
              <Input
                id="exam-title"
                placeholder="例如：前端基础期末考"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="exam-duration">时长（分钟）</Label>
                <Input
                  id="exam-duration"
                  type="number"
                  min={1}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="exam-start">开始时间</Label>
                <DateTimePicker
                  id="exam-start"
                  value={startTime}
                  onChange={setStartTime}
                  placeholder="选择开考时间"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam-desc">考试说明</Label>
              <Textarea
                id="exam-desc"
                placeholder="考试范围、注意事项等"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>选择题目（{selectedIds.length} 题）</Label>
                <span className="text-xs text-muted-foreground">
                  合计 {selectedScore} 分
                </span>
              </div>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                {bank.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    题库为空或加载中…
                  </p>
                )}
                {bank.map((q) => (
                  <label
                    key={q.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(q.id)}
                      onChange={() => toggleQuestion(q.id)}
                      className="size-4 accent-primary"
                    />
                    <span className="min-w-0 flex-1 truncate">{q.stem}</span>
                    <Badge variant="outline">{questionTypeLabel[q.type]}</Badge>
                    <Badge variant="secondary">{q.score} 分</Badge>
                  </label>
                ))}
              </div>
            </div>
            {dialogError && (
              <p className="text-sm text-destructive">{dialogError}</p>
            )}
            <DialogFooter>
              <DialogClose className={buttonVariants({ variant: "outline" })}>
                取消
              </DialogClose>
              <Button type="submit" disabled={saving}>
                {saving ? "创建中…" : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
