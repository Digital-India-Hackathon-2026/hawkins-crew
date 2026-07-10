import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { JourneySearchLog } from '@/lib/models/JourneySearchLog';

export async function GET() {
  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { error: 'MONGODB_URI is not set' },
        { status: 503 }
      );
    }

    await connectToDatabase();

    const totalSearches = await JourneySearchLog.countDocuments();

    const allLogs = await JourneySearchLog.find({}).select('routes').lean();

    let totalTransfers = 0;
    let successfulTransfers = 0;
    let failedTransfers = 0;
    let totalWaitingTime = 0;
    let waitingTimeCount = 0;

    allLogs.forEach((log: any) => {
      if (log.routes && Array.isArray(log.routes)) {
        log.routes.forEach((route: any) => {
          if (route.legs && Array.isArray(route.legs)) {
            route.legs.forEach((leg: any) => {
              if (leg.transfer) {
                totalTransfers++;
                if (leg.transfer.feasibilityScore && leg.transfer.feasibilityScore >= 70) {
                  successfulTransfers++;
                } else {
                  failedTransfers++;
                }
                totalWaitingTime += leg.transfer.waitingDuration || 0;
                waitingTimeCount++;
              }
            });
          }
        });
      }
    });

    const avgWaitingTime = waitingTimeCount > 0 ? totalWaitingTime / waitingTimeCount : 0;
    const successRate = totalTransfers > 0 ? (successfulTransfers / totalTransfers) * 100 : 0;

    return NextResponse.json({
      totalSearches,
      totalTransfers,
      successfulTransfers,
      failedTransfers,
      successRate: Math.round(successRate * 10) / 10,
      avgWaitingTime: Math.round(avgWaitingTime),
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
