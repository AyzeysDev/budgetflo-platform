// apps/web/src/app/api/user-profile/[userId]/route.ts
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';

const expressApiUrl = process.env.EXPRESS_API_URL;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

export async function GET(req: NextRequest, context: { params: { userId: string } }) {
  // Removed: console.log("[API /user-profile/:userId GET] Context received:", JSON.stringify(context, null, 2));
  // Accessing context.params directly can trigger the warning if done "too early" according to Next.js checks.
  // The critical part is that functional logic accesses params *after* relevant awaits.

  if (!expressApiUrl || !nextAuthSecret) {
    console.error("[API /user-profile/:userId GET] Server configuration error: Missing EXPRESS_API_URL or NEXTAUTH_SECRET.");
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }

  const token = await getToken({ req, secret: nextAuthSecret });
  // console.log("[API /user-profile/:userId GET] JWT Token:", token ? "Exists" : "Does NOT exist"); // Optional: keep for debugging

  // FIXED: Await params before accessing userId
  const params = await context.params;
  const userId = params.userId;

  // console.log("[API /user-profile/:userId GET] Extracted userId from context.params:", userId); // Optional
  // console.log("[API /user-profile/:userId GET] Typeof userId:", typeof userId); // Optional

  if (!userId || typeof userId !== 'string' || userId === '[object Object]') {
    console.error("[API /user-profile/:userId GET] Invalid userId parameter:", userId);
    return NextResponse.json({ error: 'Invalid user ID parameter.' }, { status: 400 });
  }

  if (!token || token.sub !== userId) {
    console.error(`[API /user-profile/:userId GET] Unauthorized access attempt. Token sub: ${token?.sub}, Requested userId: ${userId}`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // console.log(`[API /user-profile/:userId GET] Authorized. Fetching from Express API: ${expressApiUrl}/users/${userId}`); // Optional

  try {
    const response = await fetch(`${expressApiUrl}/users/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const responseStatus = response.status;
    const responseBodyText = await response.text();
    // console.log(`[API /user-profile/:userId GET] Express API Response Status: ${responseStatus}`); // Optional
    // console.log(`[API /user-profile/:userId GET] Express API Response Body: ${responseBodyText}`); // Optional

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseBodyText);
      } catch(e) {
        errorData = { error: "Non-JSON error from backend", details: responseBodyText };
        console.error(e);
      }
      console.error("[API /user-profile/:userId GET] Failed to fetch user profile from backend:", errorData);
      return NextResponse.json({ error: errorData.error || 'Failed to fetch user profile from backend.' }, { status: responseStatus });
    }
    
    const dataToReturn = JSON.parse(responseBodyText);
    return NextResponse.json(dataToReturn, { status: 200 });

  } catch (error) {
    console.error('[API /user-profile/:userId GET] Error proxying GET to Express API:', error);
    return NextResponse.json({ error: 'Internal server error while fetching profile.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: { userId: string } }) {
  // Removed: console.log("[API /user-profile/:userId PUT] Context received:", JSON.stringify(context, null, 2));

  if (!expressApiUrl || !nextAuthSecret) {
    console.error("[API /user-profile/:userId PUT] Server configuration error.");
    return NextResponse.json({ error: 'Server configuration error.' }, { status: 500 });
  }
  
  const token = await getToken({ req, secret: nextAuthSecret });
  // console.log("[API /user-profile/:userId PUT] JWT Token:", token ? "Exists" : "Does NOT exist"); // Optional
  
  let body;
  try {
    body = await req.json();
    // console.log("[API /user-profile/:userId PUT] Request body to send to Express:", JSON.stringify(body)); //Optional
  } catch (error) {
    console.error('[API /user-profile/:userId PUT] Error parsing request body:', error);
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // FIXED: Await params before accessing userId
  const params = await context.params;
  const userId = params.userId;
  // console.log("[API /user-profile/:userId PUT] Extracted userId from context.params:", userId); // Optional

  if (!userId || typeof userId !== 'string' || userId === '[object Object]') {
    console.error("[API /user-profile/:userId PUT] Invalid userId parameter:", userId);
    return NextResponse.json({ error: 'Invalid user ID parameter.' }, { status: 400 });
  }

  if (!token || token.sub !== userId) {
    console.error(`[API /user-profile/:userId PUT] Unauthorized access attempt. Token sub: ${token?.sub}, Requested userId: ${userId}`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // console.log(`[API /user-profile/:userId PUT] Authorized. Updating user via Express API: ${expressApiUrl}/users/${userId}`); // Optional

  try {
    const response = await fetch(`${expressApiUrl}/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const responseStatus = response.status;
    const responseBodyText = await response.text();
    // console.log(`[API /user-profile/:userId PUT] Express API Response Status: ${responseStatus}`); // Optional
    // console.log(`[API /user-profile/:userId PUT] Express API Response Body: ${responseBodyText}`); // Optional

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseBodyText);
      } catch(e) {
        errorData = { error: "Non-JSON error from backend", details: responseBodyText };
        console.error(e);
      }
      console.error("[API /user-profile/:userId PUT] Failed to update user profile via backend:", errorData);
      return NextResponse.json({ error: errorData.error || 'Failed to update user profile via backend.' }, { status: responseStatus });
    }
    
    const dataToReturn = JSON.parse(responseBodyText);
    return NextResponse.json(dataToReturn, { status: 200 });

  } catch (error) {
    console.error('[API /user-profile/:userId PUT] Error proxying PUT to Express API:', error);
    return NextResponse.json({ error: 'Internal server error while updating profile.' }, { status: 500 });
  }
}