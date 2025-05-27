// apps/web/src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth"; // Import your configuration
import type { NextRequest } from "next/server";

// The NextAuth handler initialized with your options
const nextAuthHandler = NextAuth(authOptions);

// Explicitly export named async functions for GET and POST
// This is the recommended pattern for Next.js App Router
export async function GET(req: NextRequest, { params }: { params: { nextauth: string[] } }) {
  // It's important that the main NextAuth function receives the original Request object.
  // NextRequest is compatible, but NextAuth internally might expect plain Request.
  // However, for App Router, passing NextRequest directly is common.
  // If issues arise, casting `req as unknown as Request` or `req.request` might be needed,
  // but let's try with NextRequest first as it's often fine.
  return nextAuthHandler(req, { params });
}

export async function POST(req: NextRequest, { params }: { params: { nextauth: string[] } }) {
  return nextAuthHandler(req, { params });
}

// DO NOT use: export { handler as GET, handler as POST }; (when using the above explicit functions)
// DO NOT use: export default handler; (for App Router [...catchall] routes)