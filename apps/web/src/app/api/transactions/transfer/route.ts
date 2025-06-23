import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { WebAppTransferPayload } from '@/types/transaction';

const expressApiUrl = process.env.EXPRESS_API_URL;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  if (!nextAuthSecret) {
    console.error("[BFF Transfer API] CRITICAL: NEXTAUTH_SECRET is not configured.");
    return null;
  }
  const token = await getToken({ req, secret: nextAuthSecret });
  return token?.sub || null;
}

if (!expressApiUrl) {
  console.error("[BFF Transfer API] CRITICAL: EXPRESS_API_URL is not set.");
}

export async function POST(req: NextRequest) {
  if (!expressApiUrl) {
    return NextResponse.json({ error: "API service endpoint is not configured." }, { status: 503 });
  }
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized: User not authenticated." }, { status: 401 });
  }

  let payload: WebAppTransferPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  try {
    const targetUrl = `${expressApiUrl}/users/${userId}/transactions/transfer`;
    console.log(`[BFF POST /api/transactions/transfer] Forwarding to: ${targetUrl}`);

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
       console.error(`[BFF POST /api/transactions/transfer] Backend error. Status: ${response.status}, Body:`, data);
      return NextResponse.json({ error: data.error || data.errors || 'Failed to create transfer.' }, { status: response.status });
    }
    
    return NextResponse.json(data, { status: 201 });

  } catch (error) {
     console.error("[BFF POST /api/transactions/transfer] Internal error:", error);
    return NextResponse.json({ error: 'Internal Server Error while creating transfer.' }, { status: 500 });
  }
} 