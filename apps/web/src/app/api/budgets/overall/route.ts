// apps/web/src/app/api/budgets/overall/route.ts
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import type { WebAppSetOverallBudgetPayload } from '@/types/budget'; // Ensure this path is correct

const expressApiUrl = process.env.EXPRESS_API_URL;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  if (!nextAuthSecret) {
    console.error("[BFF Budgets API - /api/budgets/overall/route.ts] CRITICAL: NEXTAUTH_SECRET is not configured.");
    return null;
  }
  try {
    const token = await getToken({ req, secret: nextAuthSecret });
    return token?.sub || null;
  } catch (error) {
    console.error("[BFF Budgets API - /api/budgets/overall/route.ts] Error getting token:", error);
    return null;
  }
}

if (!expressApiUrl) {
  console.error("[BFF Budgets API - /api/budgets/overall/route.ts] CRITICAL: EXPRESS_API_URL is not set. API calls will fail.");
}

// GET overall budget for a specific period
export async function GET(req: NextRequest) {
  if (!expressApiUrl) {
    return NextResponse.json({ error: "API service endpoint is not configured." }, { status: 503 });
  }

  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized: User not authenticated." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') as 'monthly' | 'yearly' | null;
  const year = searchParams.get('year');
  const month = searchParams.get('month'); // Optional, for monthly period

  if (!period || !year || (period === 'monthly' && !month)) {
    return NextResponse.json({ error: "Missing required query parameters: period, year (and month for monthly period)." }, { status: 400 });
  }
  if (period !== 'monthly' && period !== 'yearly') {
    return NextResponse.json({ error: "Invalid period. Must be 'monthly' or 'yearly'." }, { status: 400 });
  }

  try {
    let targetUrl = `${expressApiUrl}/users/${userId}/budgets/overall?period=${period}&year=${year}`;
    if (period === 'monthly' && month) {
      targetUrl += `&month=${month}`;
    }
    console.log(`[BFF GET /api/budgets/overall] Forwarding to: ${targetUrl}`);

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
      console.error(`[BFF GET /api/budgets/overall] Non-JSON response from backend. Status: ${response.status}, Body: ${responseBody.substring(0, 500)}`);
      return NextResponse.json({ error: 'Received an invalid response from the backend service.' }, { status: 502 });
    }

    if (!response.ok) {
      console.error(`[BFF GET /api/budgets/overall] Backend error. Status: ${response.status}, Body:`, data);
      return NextResponse.json({ error: data.error || 'Failed to fetch overall budget from backend.' }, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error("[BFF GET /api/budgets/overall] Internal error proxying request:", error);
    return NextResponse.json({ error: 'Internal Server Error while fetching overall budget.' }, { status: 500 });
  }
}

// POST (or PUT) to set/update overall budget for a specific period
export async function POST(req: NextRequest) {
  if (!expressApiUrl) {
    return NextResponse.json({ error: "API service endpoint is not configured." }, { status: 503 });
  }

  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized: User not authenticated." }, { status: 401 });
  }

  let payload: WebAppSetOverallBudgetPayload;
  try {
    payload = await req.json();
  } catch (error) {
    console.error("[BFF POST /api/budgets/overall] Invalid JSON in request body:", error);
    return NextResponse.json({ error: 'Invalid request body: Malformed JSON.' }, { status: 400 });
  }

  // Basic validation, more detailed validation is on the backend
  if (!payload.amount || payload.amount <= 0 || !payload.period || !payload.year) {
    return NextResponse.json({ error: "Missing required fields: amount, period, year." }, { status: 400 });
  }
  if (payload.period === 'monthly' && (payload.month === undefined || payload.month < 1 || payload.month > 12)) {
    return NextResponse.json({ error: "Month (1-12) is required for monthly overall budget." }, { status: 400 });
  }


  try {
    const targetUrl = `${expressApiUrl}/users/${userId}/budgets/overall`;
    console.log(`[BFF POST /api/budgets/overall] Forwarding to: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'POST', // Backend route handles create or update
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
      console.error(`[BFF POST /api/budgets/overall] Non-JSON response from backend. Status: ${response.status}, Body: ${responseBody.substring(0, 500)}`);
      return NextResponse.json({ error: 'Received an invalid response from the backend service.' }, { status: 502 });
    }

    if (!response.ok) {
      console.error(`[BFF POST /api/budgets/overall] Backend error. Status: ${response.status}, Body:`, data);
      return NextResponse.json({ error: data.error || data.errors || 'Failed to set/update overall budget via backend.' }, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error("[BFF POST /api/budgets/overall] Internal error proxying request:", error);
    return NextResponse.json({ error: 'Internal Server Error while setting/updating overall budget.' }, { status: 500 });
  }
}
