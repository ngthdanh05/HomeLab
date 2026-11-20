import { CultureView } from "@/components/explore/CultureView";

/** `/culture?d=hoi-an`: mở thẳng một điểm đến (link chia sẻ được). */
export default async function CulturePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { d } = await searchParams;
  return <CultureView initialDestinationId={typeof d === "string" ? d : undefined} />;
}
