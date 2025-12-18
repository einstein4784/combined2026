"use client";

import { useState } from "react";
import { PolicyRenewalActions } from "./PolicyRenewalActions";

type Policy = {
  _id: string;
  policyNumber: string;
  policyIdNumber: string;
  coverageType: string;
  status: string;
  totalPremiumDue: number;
  amountPaid: number;
  outstandingBalance: number;
  registrationNumber?: string | null;
  engineNumber?: string | null;
  chassisNumber?: string | null;
  vehicleType?: string | null;
  coverageStartDate?: Date | string;
  coverageEndDate?: Date | string;
  notes?: string | null;
  createdAt: Date | string;
};

type Payment = {
  _id: string;
  policyId: string | { _id: string; policyNumber: string };
  amount: number;
  refundAmount?: number;
  paymentDate: Date | string;
  paymentMethod: string;
  receiptNumber: string;
  notes?: string;
};

type Props = {
  policies: Policy[];
  payments: Payment[];
  customerId: string;
};

export function CustomerPoliciesView({ policies, payments, customerId }: Props) {
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(
    policies.length > 0 ? policies[0]._id : null
  );

  const selectedPolicy = policies.find((p) => p._id === selectedPolicyId);
  
  const filteredPayments = selectedPolicyId
    ? payments.filter((pay) => {
        const policyId = typeof pay.policyId === "string" 
          ? pay.policyId 
          : pay.policyId?._id;
        return policyId === selectedPolicyId;
      })
    : payments;

  const formatDate = (date: Date | string) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return `$${Number(amount || 0).toFixed(2)}`;
  };

  if (policies.length === 0) {
    return (
      <div className="space-y-6">
        <div className="card">
          <p className="text-sm text-[var(--ic-gray-600)]">No policies found for this customer.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Policies List */}
      <div className="card space-y-3">
        <h2 className="text-lg font-semibold text-[var(--ic-navy)]">
          Policies ({policies.length})
        </h2>
        <ul className="space-y-2">
          {policies.map((p) => (
            <li
              key={p._id}
              className={`cursor-pointer rounded-lg border p-3 transition-all ${
                selectedPolicyId === p._id
                  ? "border-[var(--ic-navy)] bg-[var(--ic-navy)]/5 shadow-sm"
                  : "border-[var(--ic-gray-200)] hover:border-[var(--ic-gray-300)] hover:bg-[var(--ic-gray-50)]"
              }`}
              onClick={() => setSelectedPolicyId(p._id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-[var(--ic-navy)]">
                      {p.policyNumber}
                    </div>
                    <span
                      className={`badge ${
                        p.status === "Active"
                          ? "success"
                          : p.status === "Cancelled"
                          ? "error"
                          : "warning"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <div className="text-sm text-[var(--ic-gray-600)]">
                    {p.coverageType}
                  </div>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <PolicyRenewalActions
                    policy={{
                      _id: p._id,
                      policyNumber: p.policyNumber,
                      coverageType: p.coverageType,
                      status: p.status,
                      outstandingBalance: p.outstandingBalance,
                      registrationNumber: p.registrationNumber,
                      engineNumber: p.engineNumber,
                      chassisNumber: p.chassisNumber,
                      vehicleType: p.vehicleType,
                      coverageStartDate: p.coverageStartDate as Date,
                      coverageEndDate: p.coverageEndDate as Date,
                      totalPremiumDue: p.totalPremiumDue,
                    }}
                    customerId={customerId}
                  />
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[var(--ic-gray-600)]">
                <div>
                  Outstanding: <span className="font-semibold">{formatCurrency(p.outstandingBalance)}</span>
                </div>
                <div>
                  Premium: <span className="font-semibold">{formatCurrency(p.totalPremiumDue)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Policy Details */}
      {selectedPolicy && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--ic-navy)]">
              Policy Details
            </h2>
            <a
              href={`/policies/${selectedPolicy._id}`}
              className="text-sm font-semibold text-[var(--ic-teal)] hover:text-[var(--ic-teal-dark)] hover:underline"
            >
              View Full Policy →
            </a>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Detail label="Policy Number" value={selectedPolicy.policyNumber} />
            <Detail label="Policy ID" value={selectedPolicy.policyIdNumber} />
            <Detail label="Coverage Type" value={selectedPolicy.coverageType} />
            <Detail label="Status" value={selectedPolicy.status} />
            <Detail
              label="Coverage Start"
              value={formatDate(selectedPolicy.coverageStartDate as Date)}
            />
            <Detail
              label="Coverage End"
              value={formatDate(selectedPolicy.coverageEndDate as Date)}
            />
            <Detail
              label="Total Premium Due"
              value={formatCurrency(selectedPolicy.totalPremiumDue)}
            />
            <Detail
              label="Amount Paid"
              value={formatCurrency(selectedPolicy.amountPaid)}
            />
            <Detail
              label="Outstanding Balance"
              value={formatCurrency(selectedPolicy.outstandingBalance)}
            />
            {selectedPolicy.registrationNumber && (
              <Detail
                label="Registration Number"
                value={selectedPolicy.registrationNumber}
              />
            )}
            {selectedPolicy.engineNumber && (
              <Detail label="Engine Number" value={selectedPolicy.engineNumber} />
            )}
            {selectedPolicy.chassisNumber && (
              <Detail label="Chassis Number" value={selectedPolicy.chassisNumber} />
            )}
            {selectedPolicy.vehicleType && (
              <Detail label="Vehicle Type" value={selectedPolicy.vehicleType} />
            )}
            <Detail label="Created" value={formatDate(selectedPolicy.createdAt)} />
          </div>

          {selectedPolicy.notes && (
            <div className="rounded-lg bg-[var(--ic-gray-50)] p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ic-gray-600)]">
                Notes
              </p>
              <p className="mt-1 text-sm text-[var(--ic-gray-700)]">
                {selectedPolicy.notes}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Payment History */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--ic-navy)]">
            Payment History
            {selectedPolicy && (
              <span className="ml-2 text-sm font-normal text-[var(--ic-gray-600)]">
                for {selectedPolicy.policyNumber}
              </span>
            )}
          </h2>
          <span className="badge success">{filteredPayments.length} payments</span>
        </div>

        {filteredPayments.length === 0 ? (
          <div className="mt-4 rounded-lg bg-[var(--ic-gray-50)] p-8 text-center">
            <p className="text-sm text-[var(--ic-gray-600)]">
              No payments recorded for this policy.
            </p>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Receipt</th>
                  {!selectedPolicyId && <th>Policy</th>}
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment._id}>
                    <td>{formatDate(payment.paymentDate)}</td>
                    <td className="font-semibold">
                      {formatCurrency(payment.amount)}
                      {payment.refundAmount && payment.refundAmount > 0 && (
                        <span className="ml-1 text-xs text-red-600">
                          (Refund: {formatCurrency(payment.refundAmount)})
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="inline-flex items-center rounded-full bg-[var(--ic-gray-100)] px-2.5 py-0.5 text-xs font-medium text-[var(--ic-gray-700)]">
                        {payment.paymentMethod}
                      </span>
                    </td>
                    <td className="font-mono text-xs">{payment.receiptNumber}</td>
                    {!selectedPolicyId && (
                      <td className="text-sm">
                        {typeof payment.policyId === "object"
                          ? payment.policyId.policyNumber
                          : "—"}
                      </td>
                    )}
                    <td className="text-sm text-[var(--ic-gray-600)]">
                      {payment.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredPayments.length > 0 && (
          <div className="mt-4 rounded-lg border border-[var(--ic-gray-200)] bg-[var(--ic-gray-50)] p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--ic-gray-600)]">
                  Total Payments
                </p>
                <p className="text-xl font-bold text-[var(--ic-navy)]">
                  {formatCurrency(
                    filteredPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--ic-gray-600)]">
                  Total Refunds
                </p>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(
                    filteredPayments.reduce(
                      (sum, p) => sum + Number(p.refundAmount || 0),
                      0
                    )
                  )}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--ic-gray-600)]">
                  Net Payments
                </p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(
                    filteredPayments.reduce(
                      (sum, p) =>
                        sum + Number(p.amount || 0) - Number(p.refundAmount || 0),
                      0
                    )
                  )}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-600)]">
        {label}
      </p>
      <p className="text-sm font-semibold text-[var(--ic-navy)]">{value || "—"}</p>
    </div>
  );
}


