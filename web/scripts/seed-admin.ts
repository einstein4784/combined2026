import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDb } from "@/lib/db";
import { DEFAULT_PERMISSIONS } from "@/lib/permissions";
import { RolePermission } from "@/models/RolePermission";
import { User } from "@/models/User";

async function ensureAdminUser() {
  const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || "admin@icinsurance.com";
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "admin123";

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const existingAdmin = await User.findOne({ username: "admin" });
  if (existingAdmin) {
    existingAdmin.email = adminEmail;
    existingAdmin.password = hashedPassword;
    existingAdmin.role = "Admin";
    existingAdmin.fullName = existingAdmin.fullName || "System Administrator";
    await existingAdmin.save();
    console.log(`Admin user refreshed. username=admin password=${adminPassword}`);
  } else {
    await User.create({
      username: "admin",
      email: adminEmail,
      password: hashedPassword,
      role: "Admin",
      fullName: "System Administrator",
    });

    console.log(`Default admin created. username=admin password=${adminPassword}`);
  }
}

async function ensureRolePermissions() {
  const roles = Object.keys(DEFAULT_PERMISSIONS);
  for (const role of roles) {
    const existing = await RolePermission.findOne({ role });
    if (!existing) {
      await RolePermission.create({
        role,
        permissions: DEFAULT_PERMISSIONS[role as keyof typeof DEFAULT_PERMISSIONS],
      });
      console.log(`Default permissions created for role=${role}`);
    }
  }
}

async function main() {
  await connectDb();
  await ensureAdminUser();
  await ensureRolePermissions();
}

main()
  .then(() => {
    console.log("Seed complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

