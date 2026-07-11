import { NextResponse } from 'next/server';
import axios from 'axios';

const FLASK_API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { stationCode, trainNumbers, maxShiftMinutes = 10 } = body;

    // Call real Flask backend
    const response = await axios.post(`${FLASK_API}/admin/optimize-timetable`, {
      stationCode,
      trainNumbers,
      maxShiftMinutes,
    }, {
      timeout: 60000,  // 60s for CP-SAT solve
    });

    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Timetable optimization failed:', error);

    // Handle specific error cases
    if (error.response?.status === 400) {
      return NextResponse.json(
        { error: error.response.data.error || 'Invalid request', message: error.response.data.message },
        { status: 400 }
      );
    }

    if (error.code === 'ECONNREFUSED') {
      return NextResponse.json(
        { error: 'Backend service unavailable. Please ensure Flask server is running.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Optimization service error', details: error.message },
      { status: 500 }
    );
  }
}
