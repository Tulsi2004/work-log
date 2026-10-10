import { MoneyPanel } from "@/components/money/money-panel";

export default async function MoneyPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // What the navbar search was looking for; the panel opens already filtered to it,
  // and remounts (key) when a new search lands on the page it is already on.
  const { q } = await searchParams;
  const search = typeof q === "string" ? q : "";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Money</h1>
        <p className="text-sm text-muted-foreground">
          Salary and any other money you received, and where each rupee of it went.
        </p>
      </div>
      <MoneyPanel key={search} initialSearch={search} />
    </div>
  );
}
