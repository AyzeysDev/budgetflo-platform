// apps/web/src/app/api/transactions/route.ts
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { WebAppCreateTransactionPayload } from '@/types/transaction';

const expressApiUrl = process.env.EXPRESS_API_URL;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  if (!nextAuthSecret) {
    console.error("[BFF Transactions API] CRITICAL: NEXTAUTH_SECRET is not configured.");
    return null;
  }
  const token = await getToken({ req, secret: nextAuthSecret });
  return token?.sub || null;
}

if (!expressApiUrl) {
  console.error("[BFF Transactions API] CRITICAL: EXPRESS_API_URL is not set.");
}

// GET all transactions for the authenticated user, with filters
export async function GET(req: NextRequest) {
  if (!expressApiUrl) {
    return NextResponse.json({ error: "API service endpoint is not configured." }, { status: 503 });
  }
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized: User not authenticated." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const targetUrl = new URL(`${expressApiUrl}/users/${userId}/transactions`);
  searchParams.forEach((value, key) => {
    targetUrl.searchParams.append(key, value);
  });

  try {
    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Authenticated-User-Id': userId,
      },
      cache: 'no-store',
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to fetch transactions.' }, { status: response.status });
    }
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}

// POST a new transaction
export async function POST(req: NextRequest) {
  if (!expressApiUrl) {
    return NextResponse.json({ error: "API service endpoint is not configured." }, { status: 503 });
  }
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized: User not authenticated." }, { status: 401 });
  }

  let payload: WebAppCreateTransactionPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  try {
    const targetUrl = `${expressApiUrl}/users/${userId}/transactions`;
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
      return NextResponse.json({ error: data.error || 'Failed to create transaction.' }, { status: response.status });
    }
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}
