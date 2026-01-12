import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Generate a consistent demo UUID v4
function getDemoUserId(): string {
  return '550e8400-e29b-41d4-a716-446655440000';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.job_description || !body.job_description.trim()) {
      return NextResponse.json(
        { error: 'Job description is required and cannot be empty' },
        { status: 400 }
      );
    }

    const response = await fetch(`${API_BASE}/interview-prep/jd/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': request.headers.get('x-user-id') || getDemoUserId(),
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Backend returned ${response.status}:`,
        errorText
      );
      throw new Error(
        `Backend returned ${response.status}: ${errorText}`
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload JD',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    const url = id 
      ? `${API_BASE}/interview-prep/jd/${id}`
      : `${API_BASE}/interview-prep/jd`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-user-id': request.headers.get('x-user-id') || getDemoUserId(),
      },
    });

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch JDs' },
      { status: 500 }
    );
  }
}
