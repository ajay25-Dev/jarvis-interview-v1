import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ exerciseId: string; questionId: string }> }
) {
  try {
    const { exerciseId, questionId } = await params;
    
    // Handle synthetic exercises from plans (not in DB)
    if (exerciseId.startsWith('plan-')) {
      return NextResponse.json({
        role: 'mentor',
        content: 'I can provide more specific help once this exercise is fully generated and stored in your practice history.',
        timestamp: new Date().toISOString()
      });
    }

    const body = await request.json();
    
    const response = await fetch(
      `${API_URL}/interview-prep/exercises/${exerciseId}/questions/${questionId}/chat`,
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
    return NextResponse.json(
      { message: 'Internal server error during chat' },
      { status: 500 }
    );
  }
}
