// apps/web/src/app/api/categories/route.ts
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import type { CreateCategoryPayload } from '@/../../api/src/models/budget.model'; // Adjust path as needed

const expressApiUrl = process.env.EXPRESS_API_URL;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  if (!nextAuthSecret) {
    console.error("[BFF Categories API] NEXTAUTH_SECRET is not configured.");
    return null;
  }
  const token = await getToken({ req, secret: nextAuthSecret });
  return token?.sub || null; // 'sub' usually holds the user ID
}

// GET /api/categories - Fetches all categories for the authenticated user
export async function GET(req: NextRequest) {
  if (!expressApiUrl) {
    return NextResponse.json({ error: "API URL not configured" }, { status: 500 });
  }
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(`${expressApiUrl}/users/${userId}/categories`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        // Pass the authenticated user ID for the backend to verify, if your backend middleware expects it
        // This is a placeholder; real auth involves the backend verifying the BFF's authenticity or a user token
        'X-Authenticated-User-Id': userId, 
      },
      cache: 'no-store',
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.error || 'Failed to fetch categories from backend' }, { status: response.status });
    }
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[BFF GET /api/categories] Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/categories - Creates a new category for the authenticated user
export async function POST(req: NextRequest) {
  if (!expressApiUrl) {
    return NextResponse.json({ error: "API URL not configured" }, { status: 500 });
  }
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload: CreateCategoryPayload = await req.json();
    // The backend service should use the authenticated userId, not necessarily one from payload
    // For CreateCategoryPayload, ensure it aligns with what the backend /users/:userId/categories expects.
    // The backend route will use :userId from its path.

    const response = await fetch(`${expressApiUrl}/users/${userId}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Authenticated-User-Id': userId, // Placeholder for backend auth
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data.error || data.errors || 'Failed to create category via backend' }, { status: response.status });
    }
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[BFF POST /api/categories] Error:", error);
    return NextResponse.json({ error: 'Internal Server Error or Invalid JSON in request' }, { status: 500 });
  }
}
