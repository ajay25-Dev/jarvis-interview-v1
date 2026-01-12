import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  try {
    const { sectionId } = await params;
    const body = await request.json();

    const response = await fetch(
      `${API_URL}/v1/sections/${sectionId}/generate-exercises`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(request.headers.get('authorization') ? { Authorization: request.headers.get('authorization')! } : {}),
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
    console.error('Practice generation proxy error:', error);
    return NextResponse.json(
      { message: 'Failed to generate practice exercises' },
      { status: 500 }
    );
  }
}
