import { CompanyPanel } from "@/components/companies/company-panel";

export default async function CompaniesPage({
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
        <h1 className="text-lg font-semibold tracking-tight">Companies</h1>
        <p className="text-sm text-muted-foreground">
          Every place you have worked — designation, pay history, pay day and dates.
        </p>
      </div>
      <CompanyPanel key={search} initialSearch={search} />
    </div>
  );
}
