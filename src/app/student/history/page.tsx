"use client";

import { useEffect, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  api,
  formatTime,
  submissionStatusLabel,
  type SubmissionSummary,
} from "@/lib/api";

function HistoryTable({ records }: { records: SubmissionSummary[] }) {
  if (records.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        暂无记录
      </p>
    );
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>考试名称</TableHead>
            <TableHead>得分</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>提交时间</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium whitespace-nowrap">
                {r.examTitle}
              </TableCell>
              <TableCell>
                {r.totalScore !== null ? `${r.totalScore} 分` : `客观题 ${r.objectiveScore} 分`}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    r.status === "graded"
                      ? "default"
                      : r.status === "pending_review"
                        ? "secondary"
                        : "outline"
                  }
                >
                  {submissionStatusLabel[r.status]}
                </Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap">
                {formatTime(r.submittedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function StudentHistoryPage() {
  const [records, setRecords] = useState<SubmissionSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<SubmissionSummary[]>("/api/student/history")
      .then(setRecords)
      .catch((e: Error) => setError(e.message));
  }, []);

  const all = records ?? [];
  const graded = all.filter((r) => r.status === "graded");
  const pending = all.filter((r) => r.status === "pending_review");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">历史成绩</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          查看历次考试的得分与评阅状态。
        </p>
      </div>
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
      {!error && records === null && (
        <p className="py-10 text-center text-sm text-muted-foreground">
          加载中…
        </p>
      )}
      {records !== null && (
        <Card>
          <CardContent>
            <Tabs defaultValue="all">
              <TabsList>
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="graded">已出分</TabsTrigger>
                <TabsTrigger value="pending">待复核</TabsTrigger>
              </TabsList>
              <TabsContent value="all">
                <HistoryTable records={all} />
              </TabsContent>
              <TabsContent value="graded">
                <HistoryTable records={graded} />
              </TabsContent>
              <TabsContent value="pending">
                <HistoryTable records={pending} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
