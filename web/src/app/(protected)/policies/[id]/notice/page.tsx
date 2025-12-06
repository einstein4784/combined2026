import { connectDb } from "@/lib/db";
import { Policy } from "@/models/Policy";
import { Payment } from "@/models/Payment";
import { Customer } from "@/models/Customer";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ policyId?: string; policyNumber?: string }> };

export default async function PolicyNoticePage({ params, searchParams }: Params) {
  await connectDb();

  const resolvedParams = await params;
  const resolvedSearch = await searchParams;

  const candidateId = resolvedSearch.policyId || resolvedParams.id;
  const candidateNumber = resolvedSearch.policyNumber || resolvedParams.id;

  let policy =
    (await Policy.findById(candidateId)
      .populate("customerId", "firstName lastName idNumber address contactNumber email")
      .lean()) ||
    (await Policy.findOne({ policyNumber: candidateNumber })
      .populate("customerId", "firstName lastName idNumber address contactNumber email")
      .lean());

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

  const coverageStart = policy.coverageStartDate
    ? new Date(policy.coverageStartDate).toLocaleDateString()
    : "—";
  const coverageEnd = policy.coverageEndDate
    ? new Date(policy.coverageEndDate).toLocaleDateString()
    : "—";
  const coverageEndLong = policy.coverageEndDate
    ? new Date(policy.coverageEndDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

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
        <PrintButton />
      </div>

      <div className="notice-wrapper">
        <div className="flex flex-col items-center gap-2 text-center">
          <img
            src="/IC-LOGO-NEW.png"
            alt="Combined Insurance Services"
            className="h-64 w-auto object-contain -mt-2"
          />
          <h2 className="text-2xl font-bold text-[var(--ic-navy)] tracking-tight">Policy Renewal Notice</h2>
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

