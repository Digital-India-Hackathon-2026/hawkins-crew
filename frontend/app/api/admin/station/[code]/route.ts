import { NextResponse } from 'next/server';
import axios from 'axios';

const FLASK_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    // Forward request to Flask backend with demo data
    const response = await axios.get(`${FLASK_API}/admin/station-details/${code}`, {
      timeout: 10000,
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Station details error:', error);

    if (error.response?.status === 404) {
      return NextResponse.json(
        { error: 'Station not found' },
        { status: 404 }
      );
    }

    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { error: 'Backend service unavailable. Please ensure Flask server is running.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch station details', details: error.message },
      { status: 500 }
    );
  }
}
