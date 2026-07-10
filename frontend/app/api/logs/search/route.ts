import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { JourneySearchLog } from '@/lib/models/JourneySearchLog';

export async function POST(req: Request) {
  try {
    // Only attempt to connect to DB if MONGODB_URI is provided
    if (!process.env.MONGODB_URI) {
      return NextResponse.json({ success: false, message: 'MONGODB_URI is not set' }, { status: 503 });
    }

    await connectToDatabase();

    const body = await req.json();

    // Create a new search log from the request body
    const log = new JourneySearchLog({
      ...body,
      metadata: {
        ...body.metadata,
        clientIp: req.headers.get('x-forwarded-for') || req.headers.get('remote-addr') || 'unknown',
        browser: req.headers.get('user-agent') || 'unknown',
      }
    });

    await log.save();

    return NextResponse.json({ success: true, id: log._id }, { status: 201 });
  } catch (error) {
    console.error('Error saving journey search log:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
