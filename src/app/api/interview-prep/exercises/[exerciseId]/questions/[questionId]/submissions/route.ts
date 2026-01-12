import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ exerciseId: string; questionId: string }> },
) {
  try {
    const { exerciseId, questionId } = await params;

    const response = await fetch(
      `${API_URL}/interview-prep/exercises/${exerciseId}/questions/${questionId}/submissions`,
      {
        headers: {
          ...(request.headers.get('authorization')
            ? { Authorization: request.headers.get('authorization')! }
            : {}),
          ...(request.headers.get('x-user-id')
            ? { 'x-user-id': request.headers.get('x-user-id')! }
            : {}),
        },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { message: 'Internal server error during submission history fetch' },
      { status: 500 },
    );
  }
}
