// apps/web/src/app/api/budgets/route.ts
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import type { WebAppCreateBudgetPayload } from '@/types/budget';

const expressApiUrl = process.env.EXPRESS_API_URL;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  if (!nextAuthSecret) {
    console.error("[BFF Budgets API - /api/budgets/route.ts] CRITICAL: NEXTAUTH_SECRET is not configured.");
    return null;
  }
  try {
    const token = await getToken({ req, secret: nextAuthSecret });
    return token?.sub || null;
  } catch (error) {
    console.error("[BFF Budgets API - /api/budgets/route.ts] Error getting token:", error);
    return null;
  }
}

if (!expressApiUrl) {
  console.error("[BFF Budgets API - /api/budgets/route.ts] CRITICAL: EXPRESS_API_URL is not set. API calls will fail.");
}

// GET all budgets for the authenticated user (can be filtered)
export async function GET(req: NextRequest) {
  if (!expressApiUrl) {
    return NextResponse.json({ error: "API service endpoint is not configured." }, { status: 503 });
  }

  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized: User not authenticated." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  // Forward all relevant query parameters to the backend
  const backendSearchParams = new URLSearchParams();
  if (searchParams.get('isOverall')) backendSearchParams.set('isOverall', searchParams.get('isOverall')!);
  if (searchParams.get('activeOnly')) backendSearchParams.set('activeOnly', searchParams.get('activeOnly')!);
  if (searchParams.get('period')) backendSearchParams.set('period', searchParams.get('period')!);
  if (searchParams.get('year')) backendSearchParams.set('year', searchParams.get('year')!);
  if (searchParams.get('month')) backendSearchParams.set('month', searchParams.get('month')!);

  try {
    const targetUrl = `${expressApiUrl}/users/${userId}/budgets${backendSearchParams.toString() ? `?${backendSearchParams.toString()}` : ''}`;
    console.log(`[BFF GET /api/budgets] Forwarding to: ${targetUrl}`);

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
      console.error(`[BFF GET /api/budgets] Non-JSON response from backend. Status: ${response.status}, Body: ${responseBody.substring(0, 500)}`);
      return NextResponse.json({ error: 'Received an invalid response from the backend service.' }, { status: 502 });
    }

    if (!response.ok) {
      console.error(`[BFF GET /api/budgets] Backend error. Status: ${response.status}, Body:`, data);
      return NextResponse.json({ error: data.error || data.errors || 'Failed to fetch budgets from backend.' }, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error("[BFF GET /api/budgets] Internal error proxying request:", error);
    return NextResponse.json({ error: 'Internal Server Error while fetching budgets.' }, { status: 500 });
  }
}

// POST to create a new budget (category-specific or overall)
export async function POST(req: NextRequest) {
  if (!expressApiUrl) {
    return NextResponse.json({ error: "API service endpoint is not configured." }, { status: 503 });
  }

  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized: User not authenticated." }, { status: 401 });
  }

  let payload: WebAppCreateBudgetPayload;
  try {
    payload = await req.json();
  } catch (error) {
    console.error("[BFF POST /api/budgets] Invalid JSON in request body:", error);
    return NextResponse.json({ error: 'Invalid request body: Malformed JSON.' }, { status: 400 });
  }

  // Basic validation
  if (!payload.name || !payload.amount || payload.amount <= 0 || !payload.period || !payload.startDate || !payload.endDate) {
    return NextResponse.json({ error: "Missing required fields for budget creation." }, { status: 400 });
  }
  if ((payload.isOverall === undefined || payload.isOverall === false) && !payload.categoryId) {
    return NextResponse.json({ error: "categoryId is required for category-specific budgets." }, { status: 400 });
  }
  if (payload.isOverall === true && payload.categoryId) {
    return NextResponse.json({ error: "categoryId should not be provided for an overall budget." }, { status: 400 });
  }
  if (payload.isRecurring === true && !payload.recurrenceRule) {
    return NextResponse.json({ error: "recurrenceRule is required when isRecurring is true." }, { status: 400 });
  }

  try {
    const targetUrl = `${expressApiUrl}/users/${userId}/budgets`;
    console.log(`[BFF POST /api/budgets] Forwarding to: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'POST',
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
      console.error(`[BFF POST /api/budgets] Non-JSON response from backend. Status: ${response.status}, Body: ${responseBody.substring(0, 500)}`);
      return NextResponse.json({ error: 'Received an invalid response from the backend service.' }, { status: 502 });
    }

    if (!response.ok) {
      console.error(`[BFF POST /api/budgets] Backend error. Status: ${response.status}, Body:`, data);
      return NextResponse.json({ error: data.error || data.errors || 'Failed to create budget via backend.' }, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error("[BFF POST /api/budgets] Internal error proxying request:", error);
    return NextResponse.json({ error: 'Internal Server Error while creating budget.' }, { status: 500 });
  }
}
