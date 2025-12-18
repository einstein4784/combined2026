import { connectDb } from "@/lib/db";
import { Policy } from "@/models/Policy";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { getSession } from "@/lib/auth";
import { SendNoticeEmailButton } from "@/components/SendNoticeEmailButton";
import { formatDateOnly } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = { policyId?: string; policyNumber?: string };

async function loadPolicy(searchParams: SearchParams) {
  const candidateId = searchParams.policyId;
  const candidateNumber = searchParams.policyNumber;

  const policyById = candidateId
    ? await Policy.findById(candidateId)
        .populate("customerId", "firstName lastName idNumber address contactNumber email")
        .lean()
    : null;

  if (policyById) return policyById;

  if (candidateNumber) {
    const policyByNumber = await Policy.findOne({ policyNumber: candidateNumber })
      .populate("customerId", "firstName lastName idNumber address contactNumber email")
      .lean();
    if (policyByNumber) return policyByNumber;
  }

  return null;
}

export default async function PolicyNoticeQueryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await connectDb();
  const session = await getSession();
  const sessionUser = session
    ? await User.findById(session.id).select("fullName username email role users_location").lean()
    : null;
  const resolvedSearch = await searchParams;

  const policy =
    (await loadPolicy(resolvedSearch)) ||
    // fallback: try using policyId from policyNumber if only that is present
    (resolvedSearch.policyNumber
      ? await loadPolicy({ policyId: resolvedSearch.policyNumber })
      : null);

  if (!policy) return notFound();

  const customer = policy.customerId as any;

  const lastPayment = await Payment.find({ policyId: policy._id })
    .sort({ paymentDate: -1 })
    .limit(1)
    .lean();

  const lastPaymentAmount = lastPayment[0]?.amount;
  const lastPaymentDate = lastPayment[0]?.paymentDate;

  const totalPremium = policy.totalPremiumDue || 0;
  const paid = policy.amountPaid || 0;
  const outstanding =
    typeof policy.outstandingBalance === "number"
      ? policy.outstandingBalance
      : Math.max(totalPremium - paid, 0);

  const coverageStart = formatDateOnly(policy.coverageStartDate);
  const coverageEnd = formatDateOnly(policy.coverageEndDate);
  
  // For long format, we still need to avoid timezone shift
  const coverageEndLong = policy.coverageEndDate
    ? (() => {
        const date = new Date(policy.coverageEndDate);
        const year = date.getUTCFullYear();
        const month = date.getUTCMonth();
        const day = date.getUTCDate();
        const localDate = new Date(year, month, day);
        return localDate.toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      })()
    : "—";

  // Set location based on policy ID prefix (VF = Vieux Fort)
  const displayLocation =
    policy.policyIdNumber && policy.policyIdNumber.trim().toUpperCase().startsWith("VF")
      ? "Vieux Fort"
      : (sessionUser as any)?.users_location || (session as any)?.users_location || "—";

  return (
    <div className="p-2 space-y-3">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <p className="text-xs uppercase tracking-wide text-[var(--ic-gray-600)]">
            Policy Renewal Notice
          </p>
          <h1 className="text-2xl font-semibold text-[var(--ic-navy)]">
            {policy.policyNumber}
          </h1>
        </div>
        <div className="flex gap-2">
          <SendNoticeEmailButton
            policyId={policy._id.toString()}
            policyNumber={policy.policyNumber}
            policyIdNumber={policy.policyIdNumber}
            customerName={[customer?.firstName, customer?.lastName].filter(Boolean).join(" ")}
            customerContact={customer?.contactNumber}
            customerIdNumber={customer?.idNumber}
            coverageStart={coverageStart}
            coverageEnd={coverageEnd}
            outstanding={outstanding}
            coverageType={policy.coverageType}
            registrationNumber={(policy as any).registrationNumber || undefined}
            totalPremiumDue={policy.totalPremiumDue}
            amountPaid={policy.amountPaid}
            customerEmail={customer?.email}
          />
          <PrintButton />
        </div>
      </div>

      <div className="notice-wrapper">
        <div className="flex flex-col items-center gap-2 text-center">
          <img
            src="/Untitled-5.png"
            alt="Combined Insurance Services"
            className="h-64 w-auto object-contain -mt-2"
          />
          <h2 className="text-2xl font-bold text-[var(--ic-navy)] tracking-tight">Policy Renewal Notice</h2>
          <p className="text-sm font-bold underline text-[var(--ic-gray-800)]">
            Location: {displayLocation}
          </p>
          <div className="grid w-full gap-3 rounded-md border border-[var(--ic-gray-200)] bg-[var(--ic-gray-50)] p-3 text-xs font-semibold text-[var(--ic-gray-700)] leading-snug md:grid-cols-3">
            <div className="text-left space-y-0.5">
              <p>P.O. GM 636, Gablewoods Mall</p>
              <p>Castries, St. Lucia</p>
              <p>Tel: 758 456-0700</p>
            </div>
            <div className="text-center space-y-0.5">
              <p>Garvey Street</p>
              <p>Vieux Fort</p>
              <p>Tel: 454-5415</p>
            </div>
            <div className="text-right space-y-0.5">
              <p>Bridge Street</p>
              <p>Soufriere</p>
              <p>Tel: 457-1500</p>
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-2 rounded-md border border-[var(--ic-gray-200)] bg-[var(--ic-gray-50)] p-3 text-xs font-semibold text-[var(--ic-gray-700)] md:grid-cols-3">
          <div className="text-left space-y-0.5">
            <p>Prepared by: {sessionUser?.fullName || session?.fullName || "—"}</p>
            <p>Username: {sessionUser?.username || session?.username || "—"}</p>
          </div>
          <div className="text-center space-y-0.5">
            <p>Role: {sessionUser?.role || session?.role || "—"}</p>
            <p>Location: {displayLocation}</p>
          </div>
          <div className="text-right space-y-0.5">
            <p>Email: {sessionUser?.email || session?.email || "—"}</p>
            <p suppressHydrationWarning>Date: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
        </div>

        <div className="notice-grid">
          <div className="notice-section">
            <h3>Customer Information</h3>
            <dl>
              <div>
                <dt>Name:</dt>
                <dd>
                  {[customer?.firstName, customer?.lastName].filter(Boolean).join(" ")}
                </dd>
              </div>
              <div>
                <dt>ID Number:</dt>
                <dd>{customer?.idNumber || "—"}</dd>
              </div>
              <div>
                <dt>Address:</dt>
                <dd>{customer?.address || "—"}</dd>
              </div>
              <div>
                <dt>Contact:</dt>
                <dd>{customer?.contactNumber || "—"}</dd>
              </div>
              <div>
                <dt>Email:</dt>
                <dd>{customer?.email || "—"}</dd>
              </div>
            </dl>
          </div>
          <div className="notice-section">
            <h3>Policy Information</h3>
            <dl>
              <div>
                <dt>Policy Number:</dt>
                <dd>{policy.policyNumber}</dd>
              </div>
              <div>
                <dt>Registration Number:</dt>
                <dd>{policy.registrationNumber || "TBA"}</dd>
              </div>
              <div>
                <dt>Coverage Type:</dt>
                <dd>{policy.coverageType}</dd>
              </div>
              <div>
                <dt>Coverage Start:</dt>
                <dd>{coverageStart}</dd>
              </div>
              <div>
                <dt>Coverage End:</dt>
                <dd>{coverageEnd}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="notice-payment">
          <h3>Payment Information</h3>
          <dl>
            <div>
              <dt>Total Premium:</dt>
              <dd>${(policy.totalPremiumDue || 0).toFixed(2)}</dd>
            </div>
            <div>
              <dt>Amount Paid:</dt>
              <dd>${(policy.amountPaid || 0).toFixed(2)}</dd>
            </div>
            <div>
              <dt>Last Payment Amount:</dt>
              <dd>
                {typeof lastPaymentAmount === "number"
                  ? `$${lastPaymentAmount.toFixed(2)}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt>Last Payment Date:</dt>
              <dd>
                {lastPaymentDate ? new Date(lastPaymentDate).toLocaleDateString() : "—"}
              </dd>
            </div>
          </dl>
          <div className="notice-outstanding">
            <span>Outstanding Balance:</span>
            <strong>${outstanding.toFixed(2)}</strong>
          </div>
        </div>

        <div className="notice-important">
          <strong>IMPORTANT:</strong> Your policy is scheduled to expire on{" "}
          <strong>{coverageEndLong}</strong>. Please contact us to renew your policy before the
          expiration date to ensure continuous coverage. If you have any outstanding balance,
          please settle it at your earliest convenience.
          <br />
          <br />
          The above is the breakdown of your last renewal. Your renewal premium may be less or
          more depending on the following:
          <ul className="notice-list">
            <li>The length of time of which the policy covers.</li>
            <li>Increase in discounts, or decrease due to a claim.</li>
            <li>An increase in the insurer's premiums.</li>
            <li>
              In the case of comprehensive policies, the sum insured would be reduced due to
              depreciation.
            </li>
          </ul>
          <div className="notice-last-premium">
            <div>
              Last year's Premium: <strong>${totalPremium.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

