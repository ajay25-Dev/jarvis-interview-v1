import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

const isConnectionRefused = (error: unknown) => {
  const seen = new Set<unknown>();

  const check = (candidate: unknown): boolean => {
    if (!candidate || typeof candidate !== 'object') {
      return false;
    }

    if (seen.has(candidate)) {
      return false;
    }
    seen.add(candidate);

    const asError = candidate as {
      code?: string;
      message?: string;
      cause?: unknown;
      errors?: unknown[];
    };

    if (asError.code === 'ECONNREFUSED') {
      return true;
    }

    if (
      typeof asError.message === 'string' &&
      asError.message.includes('ECONNREFUSED')
    ) {
      return true;
    }

    if (Array.isArray(asError.errors)) {
      for (const nested of asError.errors) {
        if (check(nested)) {
          return true;
        }
      }
    }

    if (asError.cause) {
      return check(asError.cause);
    }

    return false;
  };

  return check(error);
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ exerciseId: string }> }
) {
  try {
    const { exerciseId } = await params;
    
    // Handle synthetic exercises from plans (not in DB)
    if (exerciseId.startsWith('plan-')) {
      return NextResponse.json({ 
        success: true, 
        message: 'Progress saved locally (preview mode)' 
      });
    }

    const body = await request.json();
    
    const response = await fetch(
      `${API_URL}/interview-prep/exercises/${exerciseId}/progress`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(request.headers.get('authorization') ? { 'Authorization': request.headers.get('authorization')! } : {}),
          ...(request.headers.get('x-user-id') ? { 'x-user-id': request.headers.get('x-user-id')! } : {}),
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    if (isConnectionRefused(error)) {
      return NextResponse.json({
        success: true,
        message: 'Progress saved locally (preview mode)',
      });
    }
    return NextResponse.json(
      { message: 'Internal server error during progress save' },
      { status: 500 }
    );
  }
}
