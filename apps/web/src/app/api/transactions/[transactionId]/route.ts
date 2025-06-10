import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import { WebAppUpdateTransactionPayload } from '@/types/transaction';

const expressApiUrl = process.env.EXPRESS_API_URL;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  if (!nextAuthSecret) {
    console.error("[BFF TransactionID API] CRITICAL: NEXTAUTH_SECRET is not configured.");
    return null;
  }
  const token = await getToken({ req, secret: nextAuthSecret });
  return token?.sub || null;
}

interface Context {
  params: Promise<{
    transactionId: string;
  }>;
}

// GET a specific transaction
export async function GET(req: NextRequest, { params }: Context) {
  if (!expressApiUrl) return NextResponse.json({ error: "API endpoint not configured." }, { status: 503 });

  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { transactionId } = await params;
  if (!transactionId) return NextResponse.json({ error: "Transaction ID is required." }, { status: 400 });

  try {
    const targetUrl = `${expressApiUrl}/users/${userId}/transactions/${transactionId}`;
    const response = await fetch(targetUrl, {
      headers: {
        'X-Authenticated-User-Id': userId,
      },
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data.error || 'Failed to fetch transaction.' }, { status: response.status });
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}

// PUT to update a specific transaction
export async function PUT(req: NextRequest, { params }: Context) {
  if (!expressApiUrl) return NextResponse.json({ error: "API endpoint not configured." }, { status: 503 });
  
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let payload: WebAppUpdateTransactionPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { transactionId } = await params;
  if (!transactionId) return NextResponse.json({ error: "Transaction ID is required." }, { status: 400 });
  
  try {
    const targetUrl = `${expressApiUrl}/users/${userId}/transactions/${transactionId}`;
    const response = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Authenticated-User-Id': userId,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data.error || 'Failed to update transaction.' }, { status: response.status });
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}

// DELETE a specific transaction
export async function DELETE(req: NextRequest, { params }: Context) {
  if (!expressApiUrl) return NextResponse.json({ error: "API endpoint not configured." }, { status: 503 });

  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  
  await req.text(); // Consume the body to avoid memory leaks

  const { transactionId } = await params;
  if (!transactionId) return NextResponse.json({ error: "Transaction ID is required." }, { status: 400 });

  try {
    const targetUrl = `${expressApiUrl}/users/${userId}/transactions/${transactionId}`;
    const response = await fetch(targetUrl, {
      method: 'DELETE',
      headers: {
        'X-Authenticated-User-Id': userId,
      },
    });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data.error || 'Failed to delete transaction.' }, { status: response.status });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Internal Server Error.' }, { status: 500 });
  }
}