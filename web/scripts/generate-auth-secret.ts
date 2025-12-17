// Generate a random AUTH_SECRET for NextAuth
// Run with: npx tsx scripts/generate-auth-secret.ts

import crypto from "crypto";

const secret = crypto.randomBytes(32).toString("base64");

console.log("\n" + "=".repeat(60));
console.log("Generated AUTH_SECRET:");
console.log("=".repeat(60));
console.log(secret);
console.log("=".repeat(60));
console.log("\nAdd this to your Vercel environment variables:");
console.log(`AUTH_SECRET=${secret}\n`);

