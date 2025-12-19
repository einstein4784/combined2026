import { NextRequest } from "next/server";
import { connectDb } from "@/lib/db";
import { guardPermission } from "@/lib/api-auth";
import { json, handleRouteError } from "@/lib/utils";
import { Receipt } from "@/models/Receipt";
import { rateLimitMiddleware } from "@/lib/rate-limit";
import { parsePaginationParams, createPaginatedResponse } from "@/lib/pagination";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await guardPermission("generate_cash_statements");
    if ("response" in auth) return auth.response;

    // Rate limiting
    const rateLimitResponse = rateLimitMiddleware(req, auth.session.id);
    if (rateLimitResponse) return rateLimitResponse;

    await connectDb();

    // Parse pagination params (backward compatible)
    const { searchParams } = new URL(req.url);
    const usePagination = searchParams.get('paginated') === 'true';
    const { page, limit, skip } = parsePaginationParams(searchParams);

    if (usePagination) {
      // New paginated format
      const [receipts, total] = await Promise.all([
        Receipt.find()
          .populate("customerId", "firstName lastName email")
          .populate("policyId", "policyNumber")
          .sort({ generatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Receipt.countDocuments(),
      ]);

      return json(createPaginatedResponse(receipts, total, page, limit));
    } else {
      // Old format (backward compatible) - but add safety limit
      const receipts = await Receipt.find()
        .populate("customerId", "firstName lastName email")
        .populate("policyId", "policyNumber")
        .sort({ generatedAt: -1 })
        .limit(1000) // Safety limit
        .lean();

      return json(receipts);
    }
  } catch (error) {
    return handleRouteError(error);
  }
}


