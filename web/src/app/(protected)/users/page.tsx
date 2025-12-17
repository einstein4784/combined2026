import { connectDb } from "@/lib/db";
import { User } from "@/models/User";
import { UserForm } from "@/components/forms/UserForm";
import { ResetPasswordButton } from "@/components/ResetPasswordButton";
import { DeleteUserButton } from "@/components/DeleteUserButton";
import { EditUserButton } from "@/components/EditUserButton";
import { guardPermission } from "@/lib/api-auth";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import Link from "next/link";

type SearchParams = Record<string, string | string[] | undefined>;

const normalize = (val?: string | string[]) => (Array.isArray(val) ? val[0] ?? "" : val ?? "");

function SortableHeader({
  field,
  currentSort,
  currentOrder,
  label,
  basePath = "/users",
}: {
  field: string;
  currentSort: string;
  currentOrder: number;
  label: string;
  basePath?: string;
}) {
  const isActive = currentSort === field;
  const nextOrder = isActive && currentOrder === -1 ? "asc" : "desc";
  const searchParams = new URLSearchParams();
  searchParams.set("sortBy", field);
  searchParams.set("sortOrder", nextOrder);
  
  return (
    <Link
      href={`${basePath}?${searchParams.toString()}`}
      className="flex items-center gap-1 hover:text-[var(--ic-navy)] cursor-pointer select-none"
      title={`Sort by ${label} ${nextOrder === "asc" ? "(ascending)" : "(descending)"}`}
    >
      <span>{label}</span>
      {isActive ? (
        <span className="text-[var(--ic-navy)] font-semibold">
          {currentOrder === -1 ? "↓" : "↑"}
        </span>
      ) : (
        <span className="text-[var(--ic-gray-400)] text-xs opacity-50">⇅</span>
      )}
    </Link>
  );
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const auth = await guardPermission("generate_user_report");
  if ("response" in auth) {
    redirect("/dashboard");
  }

  const params = searchParams ? await Promise.resolve(searchParams) : ({} as SearchParams);
  const sortBy = normalize(params.sortBy) || "createdAt";
  const sortOrder = normalize(params.sortOrder) === "asc" ? 1 : -1;

  await connectDb();
  
  // Build sort object
  const sortObject: Record<string, 1 | -1> = {};
  const sortFieldMap: Record<string, string> = {
    username: "username",
    fullName: "fullName",
    email: "email",
    role: "role",
    location: "users_location",
    createdAt: "createdAt",
  };
  
  const dbSortField = sortFieldMap[sortBy] || "createdAt";
  sortObject[dbSortField] = sortOrder;
  
  const users = await User.find({}, "username email role fullName users_location createdAt").sort(sortObject);

  return (
    <div className="space-y-6">
      <div className="page-title-box">
        <p className="section-heading">Security</p>
        <h4>Users & Roles</h4>
        <p className="page-subtitle">Manage operator accounts and RBAC roles.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Directory</h2>
            <span className="badge success">{users.length} users</span>
          </div>
          <table className="mt-4">
            <thead>
              <tr>
                <th>
                  <SortableHeader field="fullName" currentSort={sortBy} currentOrder={sortOrder} label="User" />
                </th>
                <th>
                  <SortableHeader field="email" currentSort={sortBy} currentOrder={sortOrder} label="Email" />
                </th>
                <th>
                  <SortableHeader field="role" currentSort={sortBy} currentOrder={sortOrder} label="Role" />
                </th>
                <th>
                  <SortableHeader field="location" currentSort={sortBy} currentOrder={sortOrder} label="Location" />
                </th>
                <th>
                  <SortableHeader field="createdAt" currentSort={sortBy} currentOrder={sortOrder} label="Created" />
                </th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id.toString()}>
                  <td>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.fullName || u.username} src={undefined} />
                      <div className="leading-tight">
                        <p className="font-semibold text-[var(--ic-navy)]">{u.fullName || u.username}</p>
                        <p className="text-xs text-[var(--ic-gray-600)]">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>{(u as any).users_location || "—"}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="text-right">
                    <div className="flex justify-end gap-3">
                      <EditUserButton
                        userId={u._id.toString()}
                        username={u.username}
                        email={u.email}
                        fullName={u.fullName}
                        role={u.role}
                        users_location={(u as any).users_location}
                      />
                      <ResetPasswordButton userId={u._id.toString()} username={u.username} />
                      <DeleteUserButton userId={u._id.toString()} username={u.username} />
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-sm text-slate-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-[var(--ic-navy)]">Add user</h2>
          <p className="text-sm text-[var(--ic-gray-600)]">Admin only.</p>
          <div className="mt-3">
            <UserForm />
          </div>
        </div>
      </div>
    </div>
  );
}

