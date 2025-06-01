// apps/web/src/app/api/categories/route.ts
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import type { CreateCategoryPayload } from '@/../../api/src/models/budget.model';

const expressApiUrl = process.env.EXPRESS_API_URL;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  if (!nextAuthSecret) {
    console.error("[BFF Categories API - /api/categories/route.ts] CRITICAL: NEXTAUTH_SECRET is not configured.");
    return null;
  }
  try {
    const token = await getToken({ req, secret: nextAuthSecret });
    return token?.sub || null;
  } catch (error) {
    console.error("[BFF Categories API - /api/categories/route.ts] Error getting token:", error);
    return null;
  }
}

if (!expressApiUrl) {
  console.error("[BFF Categories API - /api/categories/route.ts] CRITICAL: EXPRESS_API_URL is not set. API calls will fail.");
}

export async function GET(req: NextRequest) {
  if (!expressApiUrl) {
    return NextResponse.json({ error: "API service endpoint is not configured." }, { status: 503 });
  }

  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized: User not authenticated." }, { status: 401 });
  }

  try {
    const targetUrl = `${expressApiUrl}/users/${userId}/categories`;
    console.log(`[BFF GET /api/categories] Forwarding to: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Authenticated-User-Id': userId, // Added header back
      },
      cache: 'no-store',
    });

    const responseBody = await response.text();
    let data;
    try {
      data = JSON.parse(responseBody);
    } catch (e) {
      console.error(`[BFF GET /api/categories] Non-JSON response from backend. Status: ${response.status}, Body: ${responseBody.substring(0, 500)}`);
      console.log(e);
      return NextResponse.json({ error: 'Received an invalid response from the backend service.' }, { status: 502 });
    }
    
    if (!response.ok) {
      console.error(`[BFF GET /api/categories] Backend error. Status: ${response.status}, Body:`, data);
      return NextResponse.json({ error: data.error || data.errors || 'Failed to fetch categories from backend.' }, { status: response.status });
    }
    
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error("[BFF GET /api/categories] Internal error proxying request:", error);
    return NextResponse.json({ error: 'Internal Server Error while fetching categories.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!expressApiUrl) {
    return NextResponse.json({ error: "API service endpoint is not configured." }, { status: 503 });
  }

  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized: User not authenticated." }, { status: 401 });
  }

  let payload: CreateCategoryPayload;
  try {
    payload = await req.json();
  } catch (error) {
    console.error("[BFF POST /api/categories] Invalid JSON in request body:", error);
    return NextResponse.json({ error: 'Invalid request body: Malformed JSON.' }, { status: 400 });
  }
  
  const backendPayload = { ...payload };

  try {
    const targetUrl = `${expressApiUrl}/users/${userId}/categories`;
    console.log(`[BFF POST /api/categories] Forwarding to: ${targetUrl}`);

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Authenticated-User-Id': userId, // Added header back
      },
      body: JSON.stringify(backendPayload),
    });

    const responseBody = await response.text();
    let data;
    try {
      data = JSON.parse(responseBody);
    } catch (e) {
      console.error(`[BFF POST /api/categories] Non-JSON response from backend. Status: ${response.status}, Body: ${responseBody.substring(0, 500)}`);
      console.log(e);
      return NextResponse.json({ error: 'Received an invalid response from the backend service.' }, { status: 502 });
    }

    if (!response.ok) {
      console.error(`[BFF POST /api/categories] Backend error. Status: ${response.status}, Body:`, data);
      return NextResponse.json({ error: data.error || data.errors || 'Failed to create category via backend.' }, { status: response.status });
    }
    
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error("[BFF POST /api/categories] Internal error proxying request:", error);
    return NextResponse.json({ error: 'Internal Server Error while creating category.' }, { status: 500 });
  }
}
