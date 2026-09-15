import { CompanyPanel } from "@/components/companies/company-panel";

export default function CompaniesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Companies</h1>
        <p className="text-sm text-muted-foreground">
          Every place you have worked — designation, pay history, pay day and dates.
        </p>
      </div>
      <CompanyPanel />
    </div>
  );
}
