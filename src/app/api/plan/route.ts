import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// Generate a consistent demo UUID v4
function getDemoUserId(): string {
  return '550e8400-e29b-41d4-a716-446655440000';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${API_BASE}/interview-prep/plan/generate`, {
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
        error: 'Failed to generate plan',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const planId = url.searchParams.get('plan_id');
    const planEndpoint = planId
      ? `${API_BASE}/interview-prep/plan/${planId}`
      : `${API_BASE}/interview-prep/plan`;

    const response = await fetch(planEndpoint, {
      method: 'GET',
      headers: {
        'x-user-id': request.headers.get('x-user-id') || getDemoUserId(),
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(null);
      }
      throw new Error(`Backend returned ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plan' },
      { status: 500 }
    );
  }
}
