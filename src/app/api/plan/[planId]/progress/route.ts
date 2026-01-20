import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function getDemoUserId(): string {
  return '550e8400-e29b-41d4-a716-446655440000';
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ planId: string }> },
) {
  const { planId } = await context.params;
  if (!planId) {
    return NextResponse.json(
      { error: 'plan_id is required' },
      { status: 400 },
    );
  }

  const response = await fetch(
    `${API_BASE}/interview-prep/plan/${planId}/progress`,
    {
      method: 'GET',
      headers: {
        'x-user-id': request.headers.get('x-user-id') || getDemoUserId(),
        ...(request.headers.get('authorization')
          ? { Authorization: request.headers.get('authorization')! }
          : {}),
      },
    },
  );

  const parsed = await response
    .json()
    .catch(() => ({ error: 'Invalid response from backend' }));

  if (!response.ok) {
    return NextResponse.json(parsed, { status: response.status });
  }

  return NextResponse.json(parsed);
}
