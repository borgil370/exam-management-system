"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Upload } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  api,
  questionTypeLabel,
  type Question,
  type QuestionType,
} from "@/lib/api";

const typeVariant: Record<QuestionType, "default" | "secondary" | "outline"> = {
  single_choice: "default",
  true_false: "secondary",
  essay: "outline",
};

export default function AdminQuestionsPage() {
  const [questionList, setQuestionList] = useState<Question[] | null>(null);
  const [category, setCategory] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [pageError, setPageError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [stem, setStem] = useState("");
  const [type, setType] = useState<QuestionType>("single_choice");
  const [newCategory, setNewCategory] = useState("");
  const [score, setScore] = useState("10");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [tfAnswer, setTfAnswer] = useState("正确");
  const [dialogError, setDialogError] = useState("");
  const [saving, setSaving] = useState(false);

  // 分类/类型筛选直接作为 query 参数请求后端
  const loadQuestions = useCallback(() => {
    const params = new URLSearchParams();
    if (category !== "all") params.set("category", category);
    if (typeFilter !== "all") params.set("type", typeFilter);
    const query = params.toString();
    api
      .get<Question[]>(`/api/admin/questions${query ? `?${query}` : ""}`)
      .then(setQuestionList)
      .catch((e: Error) => setPageError(e.message));
  }, [category, typeFilter]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const categories = Array.from(
    new Set((questionList ?? []).map((q) => q.category))
  );

  function setOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function openCreate() {
    setDialogError("");
    setCreateOpen(true);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setDialogError("");

    // 按题型组装请求体
    const body: Record<string, unknown> = {
      type,
      stem,
      score: Number(score),
      category: newCategory,
    };
    if (type === "single_choice") {
      body.options = options.filter((o) => o.trim() !== "");
      body.correctAnswer = correctAnswer;
    } else if (type === "true_false") {
      body.correctAnswer = tfAnswer;
    }

    api
      .post<Question>("/api/admin/questions", body)
      .then(() => {
        setCreateOpen(false);
        setStem("");
        setType("single_choice");
        setNewCategory("");
        setScore("10");
        setOptions(["", "", "", ""]);
        setCorrectAnswer("");
        loadQuestions();
      })
      .catch((e: Error) => setDialogError(e.message)) // 后端 400 的具体提示
      .finally(() => setSaving(false));
  }

  const filledOptions = options.filter((o) => o.trim() !== "");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Select value={category} onValueChange={(v) => setCategory(v as string)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部分类</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as string)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="single_choice">单选题</SelectItem>
              <SelectItem value="true_false">判断题</SelectItem>
              <SelectItem value="essay">简答题</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => alert("批量导入功能开发中（占位）")}
          >
            <Upload className="size-4" />
            批量导入
          </Button>
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            新增题目
          </Button>
        </div>
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
                <TableHead className="min-w-64">题干</TableHead>
                <TableHead>类型</TableHead>
                <TableHead>分类</TableHead>
                <TableHead>分值</TableHead>
                <TableHead>答案</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(questionList ?? []).map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="max-w-md truncate font-medium">
                    {q.stem}
                  </TableCell>
                  <TableCell>
                    <Badge variant={typeVariant[q.type]}>
                      {questionTypeLabel[q.type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {q.category}
                  </TableCell>
                  <TableCell>{q.score} 分</TableCell>
                  <TableCell className="max-w-32 truncate">
                    {q.correctAnswer ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
              {questionList !== null && questionList.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-muted-foreground"
                  >
                    没有符合条件的题目
                  </TableCell>
                </TableRow>
              )}
              {questionList === null && (
                <TableRow>
                  <TableCell
                    colSpan={5}
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
            <DialogTitle>新增题目</DialogTitle>
            <DialogDescription>
              按题型填写字段：单选题需要选项和正确答案，判断题选择对/错，简答题无需答案。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="q-stem">题干</Label>
              <Textarea
                id="q-stem"
                placeholder="请输入题目内容"
                value={stem}
                onChange={(e) => setStem(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>类型</Label>
                <Select
                  value={type}
                  onValueChange={(v) => setType(v as QuestionType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single_choice">单选题</SelectItem>
                    <SelectItem value="true_false">判断题</SelectItem>
                    <SelectItem value="essay">简答题</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="q-category">分类</Label>
                <Input
                  id="q-category"
                  placeholder="如：前端基础"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="q-score">分值</Label>
                <Input
                  id="q-score"
                  type="number"
                  min={1}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                />
              </div>
            </div>

            {type === "single_choice" && (
              <div className="space-y-2">
                <Label>选项（至少 2 个）与正确答案</Label>
                {options.map((opt, i) => (
                  <Input
                    key={i}
                    placeholder={`选项 ${String.fromCharCode(65 + i)}`}
                    value={opt}
                    onChange={(e) => setOption(i, e.target.value)}
                  />
                ))}
                <Select
                  value={correctAnswer}
                  onValueChange={(v) => setCorrectAnswer(v as string)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {filledOptions.map((o) => (
                      <SelectItem key={o} value={o}>
                        正确答案：{o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {type === "true_false" && (
              <div className="space-y-2">
                <Label>正确答案</Label>
                <Select
                  value={tfAnswer}
                  onValueChange={(v) => setTfAnswer(v as string)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="正确">正确</SelectItem>
                    <SelectItem value="错误">错误</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {dialogError && (
              <p className="text-sm text-destructive">{dialogError}</p>
            )}
            <DialogFooter>
              <DialogClose className={buttonVariants({ variant: "outline" })}>
                取消
              </DialogClose>
              <Button type="submit" disabled={saving}>
                {saving ? "保存中…" : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
