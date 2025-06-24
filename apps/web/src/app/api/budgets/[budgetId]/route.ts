// apps/web/src/app/api/budgets/[budgetId]/route.ts
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import type { WebAppUpdateRecurringBudgetPayload } from '@/types/budget';

const expressApiUrl = process.env.EXPRESS_API_URL;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  if (!nextAuthSecret) {
    console.error("[BFF Budgets/:id API] CRITICAL: NEXTAUTH_SECRET is not configured.");
    return null;
  }
  try {
    const token = await getToken({ req, secret: nextAuthSecret });
    return token?.sub || null;
  } catch (error) {
    console.error("[BFF Budgets/:id API] Error getting token:", error);
    return null;
  }
}

if (!expressApiUrl) {
  console.error("[BFF Budgets/:id API] CRITICAL: EXPRESS_API_URL is not set. API calls will fail.");
}

interface Context {
  params: {
    budgetId: string;
  };
}

// GET a specific budget by ID
export async function GET(req: NextRequest, { params }: Context) {
  if (!expressApiUrl) {
    return NextResponse.json({ error: "API service endpoint is not configured." }, { status: 503 });
  }

  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized: User not authenticated." }, { status: 401 });
  }

  const { budgetId } = await params;
  if (!budgetId || typeof budgetId !== 'string') {
    return NextResponse.json({ error: "Invalid Budget ID parameter." }, { status: 400 });
  }

  try {
    const targetUrl = `${expressApiUrl}/users/${userId}/budgets/${budgetId}`;
    console.log(`[BFF GET /api/budgets/${budgetId}] Forwarding to: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Authenticated-User-Id': userId,
      },
      cache: 'no-store',
    });

    const responseBody = await response.text();
    let data;
    try {
      data = JSON.parse(responseBody);
    } catch {
      console.error(`[BFF GET /api/budgets/${budgetId}] Non-JSON response from backend. Status: ${response.status}, Body: ${responseBody.substring(0, 500)}`);
      return NextResponse.json({ error: 'Received an invalid response from the backend service.' }, { status: 502 });
    }

    if (!response.ok) {
      console.error(`[BFF GET /api/budgets/${budgetId}] Backend error. Status: ${response.status}, Body:`, data);
      return NextResponse.json({ error: data.error || 'Failed to fetch budget from backend.' }, { status: response.status });
    }
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error(`[BFF GET /api/budgets/${budgetId}] Internal error proxying request:`, error);
    return NextResponse.json({ error: 'Internal Server Error while fetching budget.' }, { status: 500 });
  }
}

// PUT to update a specific budget by ID
export async function PUT(req: NextRequest, { params }: Context) {
  if (!expressApiUrl) {
    return NextResponse.json({ error: "API service endpoint is not configured." }, { status: 503 });
  }

  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized: User not authenticated." }, { status: 401 });
  }

  const { budgetId } = await params;
  if (!budgetId || typeof budgetId !== 'string') {
    return NextResponse.json({ error: "Invalid Budget ID parameter." }, { status: 400 });
  }

  let payload: WebAppUpdateRecurringBudgetPayload;
  try {
    payload = await req.json();
  } catch (error) {
    console.error(`[BFF PUT /api/budgets/${budgetId}] Invalid JSON in request body:`, error);
    return NextResponse.json({ error: 'Invalid request body: Malformed JSON.' }, { status: 400 });
  }

  try {
    const targetUrl = `${expressApiUrl}/users/${userId}/budgets/${budgetId}`;
    console.log(`[BFF PUT /api/budgets/${budgetId}] Forwarding to: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Authenticated-User-Id': userId,
      },
      body: JSON.stringify(payload),
    });

    const responseBody = await response.text();
    let data;
    try {
      data = JSON.parse(responseBody);
    } catch {
      console.error(`[BFF PUT /api/budgets/${budgetId}] Non-JSON response from backend. Status: ${response.status}, Body: ${responseBody.substring(0, 500)}`);
      return NextResponse.json({ error: 'Received an invalid response from the backend service.' }, { status: 502 });
    }

    if (!response.ok) {
      console.error(`[BFF PUT /api/budgets/${budgetId}] Backend error. Status: ${response.status}, Body:`, data);
      return NextResponse.json({ error: data.error || data.errors || 'Failed to update budget via backend.' }, { status: response.status });
    }
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error(`[BFF PUT /api/budgets/${budgetId}] Internal error proxying request:`, error);
    return NextResponse.json({ error: 'Internal Server Error while updating budget.' }, { status: 500 });
  }
}

// DELETE a specific budget by ID
export async function DELETE(req: NextRequest, { params }: Context) {
  if (!expressApiUrl) {
    return NextResponse.json({ error: "API service endpoint is not configured." }, { status: 503 });
  }

  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized: User not authenticated." }, { status: 401 });
  }

  const { budgetId } = await params;
  if (!budgetId || typeof budgetId !== 'string') {
    return NextResponse.json({ error: "Invalid Budget ID parameter." }, { status: 400 });
  }

  try {
    const targetUrl = `${expressApiUrl}/users/${userId}/budgets/${budgetId}`;
    console.log(`[BFF DELETE /api/budgets/${budgetId}] Forwarding to: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Authenticated-User-Id': userId,
      },
    });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    
    const responseBody = await response.text();
    let data;
    try {
      data = JSON.parse(responseBody);
    } catch {
      console.error(`[BFF DELETE /api/budgets/${budgetId}] Non-JSON response from backend (and not 204). Status: ${response.status}, Body: ${responseBody.substring(0,500)}`);
      return NextResponse.json({ error: 'Received an invalid response or error from the backend service.' }, { status: response.status || 502 });
    }

    if (!response.ok) {
      console.error(`[BFF DELETE /api/budgets/${budgetId}] Backend error. Status: ${response.status}, Body:`, data);
      return NextResponse.json({ error: data.error || 'Failed to delete budget via backend.' }, { status: response.status });
    }
    
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error(`[BFF DELETE /api/budgets/${budgetId}] Internal error proxying request:`, error);
    return NextResponse.json({ error: 'Internal Server Error while deleting budget.' }, { status: 500 });
  }
}
