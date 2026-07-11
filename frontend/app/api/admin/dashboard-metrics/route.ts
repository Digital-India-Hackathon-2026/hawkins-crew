import { NextResponse } from 'next/server';
import axios from 'axios';

const FLASK_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function GET() {
  try {
    // Forward request to Flask backend with demo data
    const response = await axios.get(`${FLASK_API}/admin/dashboard-metrics`, {
      timeout: 10000,
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Dashboard metrics error:', error);

    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { error: 'Backend service unavailable. Please ensure Flask server is running.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics', details: error.message },
      { status: 500 }
    );
  }
}
