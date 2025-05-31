// apps/web/src/app/api/user-profile/[userId]/route.ts
import { getToken } from 'next-auth/jwt';
import { NextRequest, NextResponse } from 'next/server';
import type { WebAppUserSettingsUpdatePayload } from '@/types/user'; 

const expressApiUrl = process.env.EXPRESS_API_URL;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;

function checkEnvVars() {
  if (!expressApiUrl) {
    console.error("[BFF API user-profile] CRITICAL: EXPRESS_API_URL is not set.");
    throw new Error("Server configuration error: EXPRESS_API_URL missing.");
  }
  if (!nextAuthSecret) {
    console.error("[BFF API user-profile] CRITICAL: NEXTAUTH_SECRET is not set.");
    throw new Error("Server configuration error: NEXTAUTH_SECRET missing.");
  }
}

try {
  checkEnvVars();
} catch (e) {
  console.error("[BFF API user-profile] Initialization Error:", (e as Error).message);
}

export async function GET(req: NextRequest, context: { params: { userId: string } }) {
  try {
    checkEnvVars(); 
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const token = await getToken({ req, secret: nextAuthSecret });
  
  // FIXED: Await params first, then destructure
  const params = await context.params;
  const { userId } = params;

  if (!userId || typeof userId !== 'string') {
    console.error("[BFF API GET /user-profile/:userId] Invalid userId parameter:", userId);
    return NextResponse.json({ error: 'Invalid user ID parameter.' }, { status: 400 });
  }

  if (!token || token.sub !== userId) {
    console.warn(`[BFF API GET /user-profile/:userId] Unauthorized. Token sub: ${token?.sub}, Requested userId: ${userId}`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  console.log(`[BFF API GET /user-profile/:userId] Authorized. Fetching from Express API: ${expressApiUrl}/users/${userId}`);

  try {
    const response = await fetch(`${expressApiUrl}/users/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', 
    });

    const responseStatus = response.status;
    const responseBodyText = await response.text(); 

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseBodyText);
      } catch(e) {
        errorData = { error: "Non-JSON error from backend", details: responseBodyText.substring(0, 500) };
        console.log(e);
      }
      console.error(`[BFF API GET /user-profile/:userId] Failed to fetch profile from Express. Status: ${responseStatus}`, errorData);
      return NextResponse.json({ error: errorData.error || 'Failed to fetch user profile from backend.' }, { status: responseStatus });
    }
    
    const dataToReturn = JSON.parse(responseBodyText); 
    return NextResponse.json(dataToReturn, { status: 200 });

  } catch (error) {
    console.error('[BFF API GET /user-profile/:userId] Error proxying GET to Express API:', error);
    return NextResponse.json({ error: 'Internal server error while fetching profile.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, context: { params: { userId: string } }) {
  try {
    checkEnvVars();
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }

  const token = await getToken({ req, secret: nextAuthSecret });
  
  // FIXED: Await params first, then destructure
  const params = await context.params;
  const { userId } = params;

  if (!userId || typeof userId !== 'string') {
    console.error("[BFF API PUT /user-profile/:userId] Invalid userId parameter:", userId);
    return NextResponse.json({ error: 'Invalid user ID parameter.' }, { status: 400 });
  }

  if (!token || token.sub !== userId) {
    console.warn(`[BFF API PUT /user-profile/:userId] Unauthorized. Token sub: ${token?.sub}, Requested userId: ${userId}`);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: WebAppUserSettingsUpdatePayload;
  try {
    body = await req.json();
  } catch (error) {
    console.error('[BFF API PUT /user-profile/:userId] Error parsing request body:', error);
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const targetApiUrl = `${expressApiUrl}/users/${userId}/settings`;
  console.log(`[BFF API PUT /user-profile/:userId] Authorized. Updating user settings via Express API: PUT ${targetApiUrl}`);

  try {
    const response = await fetch(targetApiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const responseStatus = response.status;
    const responseBodyText = await response.text();

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseBodyText);
      } catch(e) {
        errorData = { error: "Non-JSON error from backend", details: responseBodyText.substring(0,500) };
        console.log(e);
      }
      console.error(`[BFF API PUT /user-profile/:userId] Failed to update settings via Express. Status: ${responseStatus}`, errorData);
      return NextResponse.json({ error: errorData.error || 'Failed to update user settings via backend.' }, { status: responseStatus });
    }
    
    const dataToReturn = JSON.parse(responseBodyText); 
    return NextResponse.json(dataToReturn, { status: 200 });

  } catch (error) {
    console.error('[BFF API PUT /user-profile/:userId] Error proxying PUT to Express API:', error);
    return NextResponse.json({ error: 'Internal server error while updating settings.' }, { status: 500 });
  }
}