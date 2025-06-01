// apps/web/src/app/api/categories/[categoryId]/route.ts
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import type { UpdateCategoryPayload } from '@/../../api/src/models/budget.model'; // Adjust path

const expressApiUrl = process.env.EXPRESS_API_URL;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  if (!nextAuthSecret) {
    console.error("[BFF Categories/:id API] NEXTAUTH_SECRET is not configured.");
    return null;
  }
  const token = await getToken({ req, secret: nextAuthSecret });
  return token?.sub || null;
}

interface Context {
  params: {
    categoryId: string;
  };
}

// GET /api/categories/[categoryId]
export async function GET(req: NextRequest, { params }: Context) {
  if (!expressApiUrl) return NextResponse.json({ error: "API URL not configured" }, { status: 500 });
  
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { categoryId } = params;
  if (!categoryId) return NextResponse.json({ error: "Category ID is required" }, { status: 400 });

  try {
    const response = await fetch(`${expressApiUrl}/users/${userId}/categories/${categoryId}`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'X-Authenticated-User-Id': userId, // Placeholder for backend auth
       },
      cache: 'no-store',
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`[BFF GET /api/categories/${categoryId}] Error:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/categories/[categoryId]
export async function PUT(req: NextRequest, { params }: Context) {
  if (!expressApiUrl) return NextResponse.json({ error: "API URL not configured" }, { status: 500 });

  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { categoryId } = params;
  if (!categoryId) return NextResponse.json({ error: "Category ID is required" }, { status: 400 });

  try {
    const payload: UpdateCategoryPayload = await req.json();
    const response = await fetch(`${expressApiUrl}/users/${userId}/categories/${categoryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Authenticated-User-Id': userId, // Placeholder
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`[BFF PUT /api/categories/${categoryId}] Error:`, error);
    return NextResponse.json({ error: 'Internal Server Error or Invalid JSON' }, { status: 500 });
  }
}

// DELETE /api/categories/[categoryId]
export async function DELETE(req: NextRequest, { params }: Context) {
  if (!expressApiUrl) return NextResponse.json({ error: "API URL not configured" }, { status: 500 });

  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { categoryId } = params;
  if (!categoryId) return NextResponse.json({ error: "Category ID is required" }, { status: 400 });

  try {
    const response = await fetch(`${expressApiUrl}/users/${userId}/categories/${categoryId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Authenticated-User-Id': userId, // Placeholder
      },
    });
    // DELETE might return 200 with data or 204 No Content
    if (response.status === 204) {
        return new NextResponse(null, { status: 204 });
    }
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`[BFF DELETE /api/categories/${categoryId}] Error:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
