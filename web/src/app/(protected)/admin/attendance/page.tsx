import { redirect } from "next/navigation";
import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { AuditLog } from "@/models/AuditLog";
import { User } from "@/models/User";
import { PrintButton } from "@/components/PrintButton";
import { SortableHeader } from "@/components/SortableHeader";

type SearchParams = Promise<{ from?: string; to?: string; userId?: string; sortBy?: string; sortOrder?: string }>;

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const d = new Date(`${value}T00:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function startOfDay(date: Date | null): Date | null {
  if (!date) return null;
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date | null): Date | null {
  if (!date) return null;
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export default async function AttendancePage({ searchParams }: { searchParams: SearchParams }) {
  const auth = await guardPermission("manage_permissions");
  if ("response" in auth) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const from = startOfDay(parseDate(params.from)) ?? startOfDay(new Date());
  const to = endOfDay(parseDate(params.to)) ?? endOfDay(new Date());
  const selectedUserId = (params.userId || "").toString();
  const sortBy = params.sortBy || "createdAt";
  const sortOrder = params.sortOrder === "asc" ? 1 : -1;

  await connectDb();

  const users = await User.find({}, "username fullName").sort({ username: 1 }).lean();

  // Build sort object
  const sortObject: Record<string, 1 | -1> = {};
  const sortFieldMap: Record<string, string> = {
    createdAt: "createdAt",
    action: "action",
  };
  const dbSortField = sortFieldMap[sortBy] || "createdAt";
  sortObject[dbSortField] = sortOrder;

  const logs = await AuditLog.find({
    action: { $in: ["LOGIN", "LOGOUT"] },
    createdAt: { $gte: from!, $lte: to! },
  })
    .populate("userId", "username fullName role")
    .sort(sortObject)
    .lean();

  const mapUser = (u: any) => u?.fullName || u?.username || "Unknown";
  const selectedUser = selectedUserId
    ? users.find((u: any) => u._id.toString() === selectedUserId)
    : null;

  // Compute session durations by pairing LOGIN -> LOGOUT per user
  const durationsByLogId = new Map<string, number>();
  const totalByUser = new Map<string, number>();
  const openLogin = new Map<string, number>(); // userId -> timestamp ms
  const asc = [...logs].sort(
    (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  for (const log of asc) {
    const uid = (log.userId as any)?._id?.toString?.() || "";
    const ts = new Date(log.createdAt).getTime();
    if (log.action === "LOGIN") {
      openLogin.set(uid, ts);
    } else if (log.action === "LOGOUT") {
      const start = openLogin.get(uid);
      if (start) {
        const ms = Math.max(0, ts - start);
        durationsByLogId.set(log._id.toString(), ms);
        totalByUser.set(uid, (totalByUser.get(uid) || 0) + ms);
        openLogin.delete(uid);
      }
    }
  }

  const filtered = selectedUserId
    ? logs.filter((log: any) => {
        const u: any = log.userId || {};
        return u._id?.toString?.() === selectedUserId;
      })
    : logs;

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <p className="section-heading">Admin</p>
        <h4>
          Login Attendance Report{" "}
          {selectedUser ? mapUser(selectedUser) : "(All users)"}
        </h4>
        <p className="page-subtitle">Login and logout times, admin only.</p>
      </div>

      <div className="card space-y-4">
        <form className="flex flex-wrap items-end gap-3" method="GET">
          <div>
            <label className="text-sm font-medium text-[var(--ic-gray-700)]">From</label>
            <input
              type="date"
              name="from"
              className="mt-1"
              defaultValue={from?.toISOString().slice(0, 10)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--ic-gray-700)]">To</label>
            <input
              type="date"
              name="to"
              className="mt-1"
              defaultValue={to?.toISOString().slice(0, 10)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[var(--ic-gray-700)]">User</label>
            <select name="userId" className="mt-1 w-56" defaultValue={selectedUserId}>
              <option value="">All users</option>
              {users.map((u: any) => (
                <option key={u._id.toString()} value={u._id.toString()}>
                  {u.username} {u.fullName ? `– ${u.fullName}` : ""}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary mt-1">
            Apply
          </button>
          <PrintButton />
        </form>

        <div className="flex items-center justify-between text-sm text-[var(--ic-gray-700)]">
          <span>
            Showing {filtered.length} record{filtered.length === 1 ? "" : "s"} between{" "}
            {from?.toLocaleDateString()} and {to?.toLocaleDateString()}
            {selectedUserId
              ? ` for ${
                  mapUser(
                    users.find((u: any) => u._id.toString() === selectedUserId) || {
                      username: "user",
                    },
                  )
                }`
              : ""}
          </span>
          {(() => {
            const totalMs = selectedUserId
              ? totalByUser.get(selectedUserId) || 0
              : Array.from(totalByUser.values()).reduce((a, b) => a + b, 0);
            const hours = Math.floor(totalMs / 3_600_000);
            const mins = Math.floor((totalMs % 3_600_000) / 60_000);
            const secs = Math.floor((totalMs % 60_000) / 1000);
            return (
              <span className="font-semibold text-[var(--ic-navy)]">
                Total time: {hours}h {mins}m {secs}s
              </span>
            );
          })()}
        </div>

        <div className="overflow-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th>User</th>
                <th>
                  <SortableHeader
                    field="action"
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    label="Action"
                    basePath="/admin/attendance"
                    searchParams={params}
                  />
                </th>
                <th>
                  <SortableHeader
                    field="createdAt"
                    currentSort={sortBy}
                    currentOrder={sortOrder}
                    label="When"
                    basePath="/admin/attendance"
                    searchParams={params}
                  />
                </th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((log: any) => (
                <tr key={log._id.toString()}>
                  <td>{mapUser(log.userId)}</td>
                  <td>
                    <span
                      className={`badge ${
                        log.action === "LOGIN" ? "badge-success" : "badge-ghost"
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td>
                    {new Date(log.createdAt).toLocaleString(undefined, {
                      dateStyle: "long",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="text-xs text-[var(--ic-gray-700)]">
                    {(() => {
                      const dur = durationsByLogId.get(log._id.toString());
                      if (dur === undefined) return "—";
                      const h = Math.floor(dur / 3_600_000);
                      const m = Math.floor((dur % 3_600_000) / 60_000);
                      const s = Math.floor((dur % 60_000) / 1000);
                      return `Duration: ${h}h ${m}m ${s}s`;
                    })()}
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-sm text-[var(--ic-gray-600)]">
                    No login/logoff records in this range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="mt-3 text-sm font-semibold text-[var(--ic-navy)]">
            {(() => {
              const totalMs = selectedUserId
                ? totalByUser.get(selectedUserId) || 0
                : Array.from(totalByUser.values()).reduce((a, b) => a + b, 0);
              const hours = Math.floor(totalMs / 3_600_000);
              const mins = Math.floor((totalMs % 3_600_000) / 60_000);
              const secs = Math.floor((totalMs % 60_000) / 1000);
              return `Total time for ${
                selectedUser ? mapUser(selectedUser) : "all users"
              }: ${hours}h ${mins}m ${secs}s`;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}


