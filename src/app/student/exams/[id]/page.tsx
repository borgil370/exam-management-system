import { ExamRunner } from "@/components/exam-runner";

export default async function ExamTakingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ExamRunner examId={id} />;
}
