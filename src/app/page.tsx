import Link from "next/link";
import { ClipboardList, Clock, LineChart, GraduationCap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const features = [
  {
    icon: ClipboardList,
    title: "在线答题",
    description: "支持单选、判断、简答等多种题型，题号导航随时切换题目。",
  },
  {
    icon: Clock,
    title: "自动计时",
    description: "考试全程倒计时，时间结束自动交卷，答题进度实时可见。",
  },
  {
    icon: LineChart,
    title: "成绩管理",
    description: "客观题自动评分，主观题人工复核，历史成绩随时查询。",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold">
            <GraduationCap className="size-5" />
            云考 · 在线考试管理系统
          </div>
          <Link href="/login" className={buttonVariants({ size: "sm" })}>
            登录
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4">
        <section className="py-16 text-center sm:py-24">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            简单高效的在线考试平台
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            为学生提供专注的在线答题体验，为教师提供考试发布、题库管理与提交复核的一站式管理后台。
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/login" className={buttonVariants({ size: "lg" })}>
              立即登录
            </Link>
            <Link
              href="/login"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              学生入口
            </Link>
          </div>
        </section>

        <section className="grid gap-4 pb-12 sm:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <f.icon className="size-6 text-primary" />
                <CardTitle>{f.title}</CardTitle>
                <CardDescription>{f.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <Separator />

        <section className="py-12">
          <Card>
            <CardHeader>
              <CardTitle>考试须知</CardTitle>
              <CardDescription>参加考试前请仔细阅读以下说明</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                <li>请在考试开始前登录系统，进入「我的考试」查看可参加的考试。</li>
                <li>考试开始后系统会自动倒计时，时间结束将自动提交试卷。</li>
                <li>答题过程中可随时通过题号导航切换题目，已作答题目会有标记。</li>
                <li>提交试卷前请确认所有题目均已作答，提交后不可修改。</li>
                <li>成绩公布后可在「历史成绩」中查看得分与评阅状态。</li>
              </ul>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        云考 · 在线考试管理系统（演示环境，数据均为 Mock）
      </footer>
    </div>
  );
}
