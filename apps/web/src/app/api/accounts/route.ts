// apps/web/src/app/api/accounts/route.ts
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import type { WebAppCreateAccountPayload } from '@/types/account';

const expressApiUrl = process.env.EXPRESS_API_URL;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  if (!nextAuthSecret) {
    console.error("[BFF Accounts API] CRITICAL: NEXTAUTH_SECRET is not configured.");
    return null;
  }
  const token = await getToken({ req, secret: nextAuthSecret });
  return token?.sub || null;
}

if (!expressApiUrl) {
  console.error("[BFF Accounts API] CRITICAL: EXPRESS_API_URL is not set.");
}

// GET all accounts for the authenticated user
export async function GET(req: NextRequest) {
  if (!expressApiUrl) {
    return NextResponse.json({ error: "API service endpoint is not configured." }, { status: 503 });
  }

  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized: User not authenticated." }, { status: 401 });
  }

  try {
    const targetUrl = `${expressApiUrl}/users/${userId}/accounts`;
    console.log(`[BFF GET /api/accounts] Forwarding to: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Authenticated-User-Id': userId,
      },
      cache: 'no-store',
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error(`[BFF GET /api/accounts] Backend error. Status: ${response.status}, Body:`, data);
      return NextResponse.json({ error: data.error || 'Failed to fetch accounts.' }, { status: response.status });
    }
    
    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error("[BFF GET /api/accounts] Internal error:", error);
    return NextResponse.json({ error: 'Internal Server Error while fetching accounts.' }, { status: 500 });
  }
}

// POST a new account for the authenticated user
export async function POST(req: NextRequest) {
  if (!expressApiUrl) {
    return NextResponse.json({ error: "API service endpoint is not configured." }, { status: 503 });
  }

  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized: User not authenticated." }, { status: 401 });
  }

  let payload: WebAppCreateAccountPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body: Malformed JSON.' }, { status: 400 });
  }

  try {
    const targetUrl = `${expressApiUrl}/users/${userId}/accounts`;
    console.log(`[BFF POST /api/accounts] Forwarding to: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Authenticated-User-Id': userId,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[BFF POST /api/accounts] Backend error. Status: ${response.status}, Body:`, data);
      return NextResponse.json({ error: data.error || data.errors || 'Failed to create account.' }, { status: response.status });
    }
    
    return NextResponse.json(data, { status: 201 });

  } catch (error) {
    console.error("[BFF POST /api/accounts] Internal error:", error);
    return NextResponse.json({ error: 'Internal Server Error while creating account.' }, { status: 500 });
  }
}
