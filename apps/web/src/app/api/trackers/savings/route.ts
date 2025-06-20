import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const url = `${API_BASE_URL}/api/users/${session.user.id}/trackers/savings${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      headers: {
        'X-Authenticated-User-Id': session.user.id,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching savings trackers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const url = `${API_BASE_URL}/api/users/${session.user.id}/trackers/savings`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Authenticated-User-Id': session.user.id,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating savings tracker:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { trackerId, ...updateData } = body;
    
    if (!trackerId) {
      return NextResponse.json({ error: 'Tracker ID is required for updates' }, { status: 400 });
    }

    const url = `${API_BASE_URL}/api/users/${session.user.id}/trackers/savings/${trackerId}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Authenticated-User-Id': session.user.id,
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating savings tracker:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trackerId = searchParams.get('id');

    if (!trackerId) {
      return NextResponse.json({ error: 'Tracker ID is required for deletion' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = `${API_BASE_URL}/api/trackers/savings/${trackerId}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'X-Authenticated-User-Id': session.user.id,
      },
    });

    if (!response.ok) {
      try {
        const error = await response.json();
        return NextResponse.json(error, { status: response.status });
      } catch {
        return NextResponse.json({ error: 'An unexpected error occurred on the backend.' }, { status: response.status });
      }
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error in proxy delete savings tracker:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 