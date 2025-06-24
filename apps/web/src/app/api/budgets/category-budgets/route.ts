import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

const expressApiUrl = process.env.EXPRESS_API_URL;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  if (!nextAuthSecret) {
    console.error("[BFF Category Budgets API] CRITICAL: NEXTAUTH_SECRET is not configured.");
    return null;
  }
  try {
    const token = await getToken({ req, secret: nextAuthSecret });
    return token?.sub || null;
  } catch (error) {
    console.error("[BFF Category Budgets API] Error getting token:", error);
    return null;
  }
}

if (!expressApiUrl) {
  console.error("[BFF Category Budgets API] CRITICAL: EXPRESS_API_URL is not set. API calls will fail.");
}

// GET category budgets for a specific period (includes recurring budgets)
export async function GET(req: NextRequest) {
  if (!expressApiUrl) {
    return NextResponse.json({ error: "API service endpoint is not configured." }, { status: 503 });
  }

  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized: User not authenticated." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year');
  const month = searchParams.get('month');

  // Validate required parameters
  if (!year || !month) {
    return NextResponse.json({ 
      error: "Missing required parameters: year and month are required." 
    }, { status: 400 });
  }

  try {
    const targetUrl = `${expressApiUrl}/users/${userId}/budgets/category-budgets?year=${year}&month=${month}`;
    console.log(`[BFF GET /api/budgets/category-budgets] Forwarding to: ${targetUrl}`);

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
      console.error(`[BFF GET /api/budgets/category-budgets] Non-JSON response from backend. Status: ${response.status}, Body: ${responseBody.substring(0, 500)}`);
      return NextResponse.json({ error: 'Received an invalid response from the backend service.' }, { status: 502 });
    }

    if (!response.ok) {
      console.error(`[BFF GET /api/budgets/category-budgets] Backend error. Status: ${response.status}, Body:`, data);
      return NextResponse.json({ error: data.error || data.errors || 'Failed to fetch category budgets from backend.' }, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error("[BFF GET /api/budgets/category-budgets] Internal error proxying request:", error);
    return NextResponse.json({ error: 'Internal Server Error while fetching category budgets.' }, { status: 500 });
  }
} 