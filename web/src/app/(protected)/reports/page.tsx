import { ReportsView } from "@/components/ReportsView";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <p className="section-heading">Reporting</p>
        <h4>Reports</h4>
        <p className="page-subtitle">
          Run cash statements over any range. Add more reports via the API.
        </p>
      </div>
      <ReportsView />
    </div>
  );
}

