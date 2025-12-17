import { connectDb } from "./db";
import { logAuditAction } from "./audit";
import { Customer } from "@/models/Customer";
import { Policy } from "@/models/Policy";
import { Payment } from "@/models/Payment";
import { Receipt } from "@/models/Receipt";
import { User } from "@/models/User";

type DeleteContext = {
  actingUserId: string;
  reason?: string | null;
};

export async function deleteCustomer(id: string, ctx: DeleteContext) {
  await connectDb();
  await Customer.findByIdAndDelete(id);
  await logAuditAction({
    userId: ctx.actingUserId,
    action: "DELETE_CUSTOMER",
    entityType: "Customer",
    entityId: id,
    details: ctx.reason ? { reason: ctx.reason } : undefined,
  });
}

export async function deletePolicy(id: string, ctx: DeleteContext) {
  await connectDb();
  await Policy.findByIdAndDelete(id);
  await logAuditAction({
    userId: ctx.actingUserId,
    action: "DELETE_POLICY",
    entityType: "Policy",
    entityId: id,
    details: ctx.reason ? { reason: ctx.reason } : undefined,
  });
}

export async function deletePayment(id: string, ctx: DeleteContext) {
  await connectDb();
  await Payment.findByIdAndDelete(id);
  await Receipt.deleteMany({ paymentId: id });
  await logAuditAction({
    userId: ctx.actingUserId,
    action: "DELETE_PAYMENT",
    entityType: "Payment",
    entityId: id,
    details: ctx.reason ? { reason: ctx.reason } : undefined,
  });
}

export async function deleteReceipt(id: string, ctx: DeleteContext) {
  await connectDb();
  await Receipt.findByIdAndDelete(id);
  await logAuditAction({
    userId: ctx.actingUserId,
    action: "DELETE_RECEIPT",
    entityType: "Receipt",
    entityId: id,
    details: ctx.reason ? { reason: ctx.reason } : undefined,
  });
}

export async function deleteUser(id: string, ctx: DeleteContext) {
  await connectDb();
  const target = await User.findById(id).select("username role");
  if (!target) {
    throw new Error("User not found");
  }
  const username = target.username?.toLowerCase();
  if (ctx.actingUserId === id) {
    throw new Error("Cannot delete your own account");
  }
  if (username === "admin") {
    throw new Error("The admin account cannot be deleted");
  }
  if (username === "nicholas.dass") {
    throw new Error("This account is locked and cannot be deleted");
  }

  await User.findByIdAndDelete(id);
  await logAuditAction({
    userId: ctx.actingUserId,
    action: "DELETE_USER",
    entityType: "User",
    entityId: id,
    details: ctx.reason ? { reason: ctx.reason } : undefined,
  });
}

export async function performDeletion(entityType: string, entityId: string, ctx: DeleteContext) {
  switch (entityType) {
    case "customer":
      return deleteCustomer(entityId, ctx);
    case "policy":
      return deletePolicy(entityId, ctx);
    case "payment":
      return deletePayment(entityId, ctx);
    case "receipt":
      return deleteReceipt(entityId, ctx);
    case "user":
      return deleteUser(entityId, ctx);
    default:
      throw new Error(`Unsupported entity type: ${entityType}`);
  }
}



