import { guardPermission } from "@/lib/api-auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SupportPage() {
  const auth = await guardPermission("view_dashboard");
  if ("response" in auth) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <p className="section-heading">Support</p>
        <h4>Help & Contacts</h4>
        <p className="page-subtitle">Get assistance and watch the tutorial video.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-600)]">Tutorial</p>
              <h2 className="text-lg font-semibold text-[var(--ic-navy)]">System Walkthrough</h2>
            </div>
            <a
                href="https://youtu.be/6k3LLoF0jv4"
                target="_blank"
                className="text-sm font-semibold text-[var(--ic-navy)] underline"
              >
                Watch on YouTube
              </a>
          </div>
            <div className="aspect-video overflow-hidden rounded-lg border border-[var(--ic-gray-200)] bg-black">
              <iframe
                className="h-full w-full"
                src="https://www.youtube.com/embed/6k3LLoF0jv4"
                title="System Walkthrough"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
        </div>

        <div className="card space-y-4 border-[var(--ic-navy)]/10 shadow-md">
          <div className="rounded-xl border border-[var(--ic-navy)]/15 bg-gradient-to-r from-[var(--ic-navy)]/5 via-white to-[var(--ic-teal)]/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--ic-gray-600)]">Support contact</p>
            <h2 className="text-2xl font-semibold text-[var(--ic-navy)] leading-tight">Nicholas Dass</h2>
            <p className="text-sm text-[var(--ic-gray-700)]">Developer · Einstein Production TT Co Ltd</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="badge success">Primary</span>
              <span className="badge info">Response: High priority</span>
            </div>
          </div>

          <div className="space-y-3 text-sm text-[var(--ic-gray-800)]">
            <div className="rounded-lg border border-[var(--ic-gray-200)] bg-white p-3 shadow-sm">
              <p className="text-[12px] uppercase tracking-[0.14em] text-[var(--ic-gray-500)]">Direct lines</p>
              <p className="mt-1 text-base font-semibold text-[var(--ic-navy)]">Phone: 1868 460 3788</p>
              <p className="text-base font-semibold text-[var(--ic-navy)]">WhatsApp: 1868 725 5305</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  href="tel:+18684603788"
                  className="btn btn-ghost btn-sm border-[var(--ic-gray-200)] text-[var(--ic-navy)]"
                >
                  Call
                </a>
                <a
                  href="https://wa.me/18687255305"
                  target="_blank"
                  className="btn btn-outline btn-sm"
                >
                  WhatsApp
                </a>
              </div>
            </div>

            <div className="rounded-lg border border-[var(--ic-gray-200)] bg-white p-3 shadow-sm">
              <p className="text-[12px] uppercase tracking-[0.14em] text-[var(--ic-gray-500)]">Email</p>
              <p className="mt-1 text-base font-semibold text-[var(--ic-navy)]">nicholas@solace-systems.com</p>
              <a
                href="mailto:nicholas@solace-systems.com?subject=Support%20Request&body=Please%20describe%20the%20issue:"
                className="btn btn-primary btn-sm mt-2"
              >
                Email support
              </a>
            </div>
          </div>

          <div className="rounded-md border border-[var(--ic-gray-200)] bg-[var(--ic-gray-50)] p-3 text-sm text-[var(--ic-gray-700)]">
            For urgent production issues, include a clear description, steps to reproduce, screenshots, and timestamps.
          </div>
        </div>
      </div>

      <div className="card space-y-5 border border-[var(--ic-gray-200)] shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-600)]">Guided steps</p>
            <h2 className="text-lg font-semibold text-[var(--ic-navy)]">How to use the system</h2>
            <p className="text-sm text-[var(--ic-gray-700)]">
              Quick, user-friendly procedures for the most common tasks.
            </p>
          </div>
          <Link href="/policies" className="btn btn-ghost btn-sm border-[var(--ic-gray-200)]">
            Go to policies
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            ["customers", "Customers"],
            ["policies", "Policies"],
            ["payments", "Payments"],
            ["advanced", "Advanced"],
            ["receipts", "Receipts"],
            ["renewals", "Renewals"],
            ["reports", "Reports"],
            ["users", "Users"],
            ["deletes", "Delete approvals"],
          ].map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-full border border-[var(--ic-gray-200)] bg-[var(--ic-gray-50)] px-3 py-1 text-xs font-semibold text-[var(--ic-navy)] hover:bg-[var(--ic-gray-100)] transition"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <StepCard
            id="customers"
            defaultOpen
            title="Create a customer"
            steps={[
              "Go to Customers › New Customer.",
              "Enter first name, last name, contact number, email, address, ID number.",
              "Click Save. The customer is now available for policies.",
            ]}
            link="/customers"
            linkLabel="Open Customers"
          />
          <StepCard
            id="policies"
            defaultOpen
            title="Create a policy"
            steps={[
              "Go to Policies › Create Policy.",
              "Select customer(s), choose coverage type, set coverage dates.",
              "Enter policy number/ID, total premium, registration number if available.",
              "Click Create. Outstanding balance is set to the total premium.",
            ]}
            link="/policies"
            linkLabel="Open Policies"
          />
          <StepCard
            id="payments"
            title="Record a full payment"
            steps={[
              "Go to Payments.",
              "Select the policy. Amount auto-fills to the outstanding balance.",
              "Click Record Full Payment to save and generate a receipt.",
            ]}
            link="/payments"
            linkLabel="Open Payments"
          />
          <StepCard
            id="advanced"
            title="Advanced payments (partial/refund)"
            steps={[
              "Go to Payments › Advanced.",
              "Select the policy. Enter payment and/or refund; both reduce outstanding.",
              "Save to update balances and optionally create receipts.",
            ]}
            link="/payments/advanced"
            linkLabel="Open Advanced Payments"
          />
          <StepCard
            id="receipts"
            title="Email a receipt"
            steps={[
              "After recording a payment, open the receipt from Payments or Receipts.",
              "Click Email Receipt to send to the customer email on file.",
            ]}
            link="/receipts"
            linkLabel="Open Receipts"
          />
          <StepCard
            id="renewals"
            title="Send renewal notices"
            steps={[
              "Go to Renewals. Use quick filters (7/14/21/30 days) or date range.",
              "Click Email on a row to send a notice, or use Email all with an optional note.",
              "Sent status shows the timestamp once the email is sent.",
            ]}
            link="/renewals"
            linkLabel="Open Renewals"
          />
          <StepCard
            id="reports"
            title="Generate cash statements"
            steps={[
              "Go to Reports › Cash.",
              "Pick range or prefix, run the report, then email or print.",
              "Transfers are listed but excluded from the cash total; refunds show in the report.",
            ]}
            link="/reports"
            linkLabel="Open Reports"
          />
          <StepCard
            id="users"
            title="User management"
            steps={[
              "Go to Users. Create or edit users, set role (Admin/Supervisor/Cashier/Underwriter).",
              "Reset passwords via the reset action; usernames must be unique.",
            ]}
            link="/users"
            linkLabel="Open Users"
          />
          <StepCard
            id="deletes"
            title="Delete approvals"
            steps={[
              "Admins/Supervisors can review delete requests in the Delete Approval tray (top-right).",
              "Approve or deny requests; actions are audited.",
            ]}
            link="/admin"
            linkLabel="Open Admin"
          />
        </div>
      </div>

      <div className="card space-y-4 shadow-sm border border-[var(--ic-gray-200)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-600)]">Policy</p>
            <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Data Privacy Statement</h2>
          </div>
        </div>
        <div className="space-y-4 rounded-xl border border-[var(--ic-gray-200)] bg-white/60 p-5 leading-relaxed text-[var(--ic-gray-800)]">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[var(--ic-navy)]">Combined Insurance Services Ltd (CISL)</p>
            <p className="text-sm text-[var(--ic-gray-700)]">Powered by Einstein Productions TT Co. Ltd (EPTT)</p>
          </div>

          <Section
            title="1. Commitment to Privacy"
            body={`CISL and EPTT are committed to protecting your personal information and ensuring that all data processed within this application is handled securely, confidentially, and in accordance with applicable data protection laws and industry best practices.`}
          />

          <Section
            title="2. Information We Collect"
            body={`This application processes the following categories of information for legitimate business and insurance-related purposes:`}
            bullets={[
              "Customer identification details (name, address, contact numbers, email, ID numbers)",
              "Policy data (policy numbers, coverage details, premiums, balances, renewal dates)",
              "Payment and receipt records",
              "User account information (username, role, activity logs)",
              "System access logs (login, logout, support interactions, attendance)",
              "No unnecessary or unrelated personal data is collected.",
            ]}
          />

          <Section
            title="3. How Your Information Is Used"
            body="The data processed within this application is used exclusively for:"
            bullets={[
              "Creating and managing customer profiles",
              "Issuing and maintaining insurance policies",
              "Processing payments and generating receipts",
              "Creating financial and operational reports",
              "Verifying user access and system activity",
              "Supporting legitimate operational and regulatory requirements",
              "Maintaining accurate records for business continuity and compliance",
              "No personal data is sold, rented, or shared with unauthorized parties.",
            ]}
          />

          <Section
            title="4. Data Ownership"
            body={`All business data stored within this system—including customer information, policies, payments, receipts, logs, and reports—remains the exclusive property of CISL. EPTT acts only as a technology provider and does not claim ownership of any customer or business data.`}
          />

          <Section
            title="5. Data Security"
            body="We implement industry-standard security measures, including:"
            bullets={[
              "Password hashing (bcrypt)",
              "Role-based access control",
              "Encrypted server-side sessions",
              "Secure database storage",
              "Audit logging of key events",
              "Regular backups",
              "Server and network security controls",
              "Only authorized users with appropriate permissions may access restricted data.",
            ]}
          />

          <Section
            title="6. Data Access and Disclosure"
            body="Access to data is strictly limited to:"
            bullets={[
              "CISL employees with appropriate roles",
              "EPTT maintenance personnel for support purposes (when required and authorized)",
              "Data is not disclosed to external parties unless required by law, regulatory obligations, or authorized by CISL management.",
            ]}
          />

          <Section
            title="7. Data Retention"
            body={`Data is retained as long as necessary to meet business, regulatory, and legal requirements. CISL may export or delete data per internal policies and the laws of Saint Lucia. Backup data follows a controlled retention cycle maintained by EPTT during the support period.`}
          />

          <Section
            title="8. User Responsibilities"
            body="All users agree to:"
            bullets={[
              "Keep login credentials secure",
              "Use the system only for authorized business activities",
              "Immediately report unauthorized access or suspected breaches",
              "Ensure data accuracy when entering customer or policy information",
              "Unauthorized use may result in system restrictions and/or disciplinary action.",
            ]}
          />

          <Section
            title="9. Third-Party Services"
            body={`The application may use third-party services such as email servers or hosting providers. These services are selected to meet industry security standards. No third-party receives customer data beyond what is necessary to operate the system.`}
          />

          <Section
            title="10. Support Access"
            body="During the support period, EPTT may access the system only with CISL’s authorization and solely for:"
            bullets={["Troubleshooting", "Maintenance", "Updates", "Bug resolution", "All such activity is logged."]}
          />

          <Section
            title="11. User Rights"
            body="Depending on local legislation, users or customers may have the right to:"
            bullets={[
              "Request access to their personal data",
              "Request correction of inaccurate data",
              "Request deletion of data where legally applicable",
              "Request clarification on how their data is processed",
              "Requests must be submitted to CISL’s designated data officer or management team.",
            ]}
          />

          <Section
            title="12. Changes to This Statement"
            body={`CISL and EPTT reserve the right to update this Data Privacy Statement to reflect changes in legal requirements, system functionality, or security/operational improvements. Any updates will be communicated within the application.`}
          />

          <Section
            title="13. Contact Information"
            body={`For data privacy questions or concerns:`}
            bullets={[
              "Combined Insurance Services Ltd (CISL) — Customer Support Department — Castries, Saint Lucia",
              "Einstein Productions TT Co. Ltd (EPTT) — Support Team — San Fernando, Trinidad & Tobago, WI",
            ]}
          />
        </div>
      </div>
    </div>
  );
}

type SectionProps = {
  title: string;
  body: string;
  bullets?: string[];
};

function Section({ title, body, bullets }: SectionProps) {
  return (
    <div className="space-y-2 rounded-lg border border-[var(--ic-gray-200)] bg-white/80 p-4 shadow-sm">
      <h3 className="text-base font-semibold text-[var(--ic-navy)]">{title}</h3>
      <p className="text-sm text-[var(--ic-gray-800)]">{body}</p>
      {bullets && bullets.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-[var(--ic-gray-800)]">
          {bullets.map((b, idx) => (
            <li key={idx}>{b}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

type StepCardProps = {
  id?: string;
  title: string;
  steps: string[];
  link?: string;
  linkLabel?: string;
  defaultOpen?: boolean;
};

function StepCard({ id, title, steps, link, linkLabel, defaultOpen }: StepCardProps) {
  return (
    <details
      id={id}
      className="group rounded-lg border border-[var(--ic-gray-200)] bg-white/80 p-4 shadow-sm transition-all duration-300 ease-out hover:shadow-md"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer items-center justify-between gap-2 list-none transition hover:opacity-90">
        <div className="flex items-center gap-2">
          <span className="text-base font-semibold text-[var(--ic-navy)]">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {link && linkLabel && (
            <Link
              href={link}
              className="text-xs font-semibold text-[var(--ic-navy)] underline underline-offset-2"
            >
              {linkLabel}
            </Link>
          )}
          <span className="text-xs text-[var(--ic-gray-500)] group-open:rotate-180 transition">
            ▼
          </span>
        </div>
      </summary>
      <div className="mt-2 overflow-hidden transition-all duration-300 ease-out opacity-0 -translate-y-1 group-open:opacity-100 group-open:translate-y-0">
        <ol className="list-decimal space-y-1 pl-4 text-sm text-[var(--ic-gray-800)]">
          {steps.map((s, idx) => (
            <li key={idx}>{s}</li>
          ))}
        </ol>
      </div>
    </details>
  );
}


