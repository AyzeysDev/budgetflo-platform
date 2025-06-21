// apps/web/src/app/api/categories/[categoryId]/route.ts
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import type { UpdateCategoryPayload } from '@/../../api/src/models/budget.model';

const expressApiUrl = process.env.EXPRESS_API_URL;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  if (!nextAuthSecret) {
    console.error("[BFF Categories/:id API - /api/categories/[categoryId]/route.ts] CRITICAL: NEXTAUTH_SECRET is not configured.");
    return null;
  }
  try {
    const token = await getToken({ req, secret: nextAuthSecret });
    return token?.sub || null;
  } catch (error) {
    console.error("[BFF Categories/:id API - /api/categories/[categoryId]/route.ts] Error getting token:", error);
    return null;
  }
}

if (!expressApiUrl) {
  console.error("[BFF Categories/:id API - /api/categories/[categoryId]/route.ts] CRITICAL: EXPRESS_API_URL is not set. API calls will fail.");
}

interface Context {
  params: Promise<{
    categoryId: string;
  }>;
}

export async function GET(req: NextRequest, { params }: Context) {
  if (!expressApiUrl) {
    return NextResponse.json({ error: "API service endpoint is not configured." }, { status: 503 });
  }

  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized: User not authenticated." }, { status: 401 });
  }

  const { categoryId } = await params;
  if (!categoryId || typeof categoryId !== 'string') {
    return NextResponse.json({ error: "Invalid Category ID parameter." }, { status: 400 });
  }

  try {
    const targetUrl = `${expressApiUrl}/users/${userId}/categories/${categoryId}`;
    console.log(`[BFF GET /api/categories/${categoryId}] Forwarding to: ${targetUrl}`);
    
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
    } catch (e) {
      console.error(`[BFF GET /api/categories/${categoryId}] Non-JSON response from backend. Status: ${response.status}, Body: ${responseBody.substring(0,500)}`);
      console.log(e);
      return NextResponse.json({ error: 'Received an invalid response from the backend service.' }, { status: 502 });
    }

    if (!response.ok) {
      console.error(`[BFF GET /api/categories/${categoryId}] Backend error. Status: ${response.status}, Body:`, data);
      return NextResponse.json({ error: data.error || 'Failed to fetch category from backend.' }, { status: response.status });
    }
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error(`[BFF GET /api/categories/${categoryId}] Internal error proxying request:`, error);
    return NextResponse.json({ error: 'Internal Server Error while fetching category.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: Context) {
  if (!expressApiUrl) {
    return NextResponse.json({ error: "API service endpoint is not configured." }, { status: 503 });
  }

  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized: User not authenticated." }, { status: 401 });
  }

  const { categoryId } = await params;
  if (!categoryId || typeof categoryId !== 'string') {
    return NextResponse.json({ error: "Invalid Category ID parameter." }, { status: 400 });
  }

  let payload: UpdateCategoryPayload;
  try {
    payload = await req.json();
  } catch (error) {
    console.error(`[BFF PUT /api/categories/${categoryId}] Invalid JSON in request body:`, error);
    return NextResponse.json({ error: 'Invalid request body: Malformed JSON.' }, { status: 400 });
  }

  try {
    const targetUrl = `${expressApiUrl}/users/${userId}/categories/${categoryId}`;
    console.log(`[BFF PUT /api/categories/${categoryId}] Forwarding to: ${targetUrl}`);

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
    } catch (e) {
      console.error(`[BFF PUT /api/categories/${categoryId}] Non-JSON response from backend. Status: ${response.status}, Body: ${responseBody.substring(0,500)}`);
      console.log(e);
      return NextResponse.json({ error: 'Received an invalid response from the backend service.' }, { status: 502 });
    }
    
    if (!response.ok) {
      console.error(`[BFF PUT /api/categories/${categoryId}] Backend error. Status: ${response.status}, Body:`, data);
      return NextResponse.json({ error: data.error || data.errors || 'Failed to update category via backend.' }, { status: response.status });
    }
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error(`[BFF PUT /api/categories/${categoryId}] Internal error proxying request:`, error);
    return NextResponse.json({ error: 'Internal Server Error while updating category.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Context) {
  if (!expressApiUrl) {
    return NextResponse.json({ error: "API service endpoint is not configured." }, { status: 503 });
  }

  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized: User not authenticated." }, { status: 401 });
  }

  const { categoryId } = await params;
  if (!categoryId || typeof categoryId !== 'string') {
    return NextResponse.json({ error: "Invalid Category ID parameter." }, { status: 400 });
  }

  let payload;
  try {
    payload = await req.json();
  } catch (error) {
    console.error(`[BFF DELETE /api/categories/${categoryId}] Invalid or empty JSON in request body:`, error);
    // Default to simple delete if body is missing for backward compatibility or other callers
    payload = { action: 'delete' }; 
  }

  try {
    const targetUrl = `${expressApiUrl}/users/${userId}/categories/${categoryId}`;
    console.log(`[BFF DELETE /api/categories/${categoryId}] Forwarding to: ${targetUrl} with payload:`, payload);

    const response = await fetch(targetUrl, {
      method: 'DELETE',
      headers: { 
        'Content-Type': 'application/json',
        'X-Authenticated-User-Id': userId,
      },
      body: JSON.stringify(payload),
    });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const responseBody = await response.text();
    let data;
    try {
      data = JSON.parse(responseBody);
    } catch (e) {
      console.error(`[BFF DELETE /api/categories/${categoryId}] Non-JSON response from backend (and not 204). Status: ${response.status}, Body: ${responseBody.substring(0,500)}`);
      console.log(e);
      return NextResponse.json({ error: 'Received an invalid response or error from the backend service.' }, { status: response.status || 502 });
    }

    if (!response.ok) {
      console.error(`[BFF DELETE /api/categories/${categoryId}] Backend error. Status: ${response.status}, Body:`, data);
      return NextResponse.json({ error: data.error || 'Failed to delete category via backend.' }, { status: response.status });
    }
    
    return NextResponse.json(data, { status: response.status });

  } catch (error) {
    console.error(`[BFF DELETE /api/categories/${categoryId}] Internal error proxying request:`, error);
    return NextResponse.json({ error: 'Internal Server Error while deleting category.' }, { status: 500 });
  }
}