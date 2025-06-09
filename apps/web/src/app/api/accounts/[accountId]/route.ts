// apps/web/src/app/api/accounts/[accountId]/route.ts
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import type { WebAppUpdateAccountPayload } from '@/types/account';

const expressApiUrl = process.env.EXPRESS_API_URL;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  if (!nextAuthSecret) {
    console.error("[BFF Accounts/:id API] CRITICAL: NEXTAUTH_SECRET is not configured.");
    return null;
  }
  const token = await getToken({ req, secret: nextAuthSecret });
  return token?.sub || null;
}

interface Context {
  params: {
    accountId: string;
  };
}

// PUT to update a specific account
export async function PUT(req: NextRequest, { params }: Context) {
  if (!expressApiUrl) {
    return NextResponse.json({ error: "API service endpoint is not configured." }, { status: 503 });
  }

  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { accountId } = params;
  if (!accountId) {
    return NextResponse.json({ error: "Account ID is required." }, { status: 400 });
  }

  let payload: WebAppUpdateAccountPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }
  
  try {
    const targetUrl = `${expressApiUrl}/users/${userId}/accounts/${accountId}`;
    console.log(`[BFF PUT /api/accounts/${accountId}] Forwarding to: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Authenticated-User-Id': userId,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
       console.error(`[BFF PUT /api/accounts] Backend error. Status: ${response.status}, Body:`, data);
      return NextResponse.json({ error: data.error || data.errors || 'Failed to update account.' }, { status: response.status });
    }

    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error(`[BFF PUT /api/accounts/${accountId}] Internal error:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE (soft delete) a specific account
export async function DELETE(req: NextRequest, { params }: Context) {
  if (!expressApiUrl) {
    return NextResponse.json({ error: "API service endpoint is not configured." }, { status: 503 });
  }

  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { accountId } = params;
  if (!accountId) {
    return NextResponse.json({ error: "Account ID is required." }, { status: 400 });
  }

  try {
    const targetUrl = `${expressApiUrl}/users/${userId}/accounts/${accountId}`;
    console.log(`[BFF DELETE /api/accounts/${accountId}] Forwarding to: ${targetUrl}`);

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
    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to delete account.' }, { status: response.status });
    }

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error(`[BFF DELETE /api/accounts/${accountId}] Internal error:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
