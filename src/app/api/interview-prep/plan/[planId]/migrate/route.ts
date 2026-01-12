import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ planId?: string }> },
) {
  const resolvedParams = await params;
  const rawPlanId = resolvedParams.planId;
  if (!rawPlanId) {
    return NextResponse.json(
      { error: 'Plan ID is required' },
      { status: 400 },
    );
  }

  const planId = parseInt(rawPlanId, 10);
  if (Number.isNaN(planId)) {
    return NextResponse.json(
      { error: 'Invalid plan ID' },
      { status: 400 },
    );
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await request.json();
  } catch {
    payload = {};
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const authorization = request.headers.get('authorization');
  if (authorization) {
    headers.Authorization = authorization;
  }

  const userId = request.headers.get('x-user-id');
  if (userId) {
    headers['x-user-id'] = userId;
  }

  try {
    const response = await fetch(
      `${API_BASE}/interview-prep/plan/${planId}/migrate`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...payload,
          plan_id: planId,
        }),
      },
    );

    const responseBody = await response.json();
    if (!response.ok) {
      return NextResponse.json(responseBody, { status: response.status });
    }

    return NextResponse.json(responseBody);
  } catch (error) {
    console.error('Plan migration proxy error', error);
    return NextResponse.json(
      {
        error: 'Failed to migrate plan data',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
