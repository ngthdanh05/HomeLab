import { AssistantView } from "@/components/explore/AssistantView";
import { ASSISTANT_QUERY_MAX_LENGTH } from "@/data/oceanQuestions";

/** `/assistant?q=…`: câu hỏi từ ô hỏi nhanh trên trang chủ được gửi ngay khi mở trang. */
export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { q } = await searchParams;
  const question = typeof q === "string" ? q.trim().slice(0, ASSISTANT_QUERY_MAX_LENGTH) : undefined;
  return <AssistantView initialQuestion={question || undefined} />;
}
