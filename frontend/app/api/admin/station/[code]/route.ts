import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import { JourneySearchLog } from '@/lib/models/JourneySearchLog';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    if (!process.env.MONGODB_URI) {
      return NextResponse.json(
        { error: 'MONGODB_URI is not set' },
        { status: 503 }
      );
    }

    const { code } = await params;

    await connectToDatabase();

    const allLogs = await JourneySearchLog.find({}).select('routes').lean();

    let totalTransfers = 0;
    let successfulTransfers = 0;
    let failedTransfers = 0;
    let totalWaitingTime = 0;
    const trainPairs: Record<string, number> = {};

    allLogs.forEach((log: any) => {
      if (log.routes && Array.isArray(log.routes)) {
        log.routes.forEach((route: any) => {
          if (route.legs && Array.isArray(route.legs)) {
            for (let i = 0; i < route.legs.length; i++) {
              const leg = route.legs[i];
              if (leg.transfer && leg.transfer.stationCode === code) {
                totalTransfers++;
                totalWaitingTime += leg.transfer.waitingDuration || 0;

                const isSuccessful = leg.transfer.feasibilityScore && leg.transfer.feasibilityScore >= 70;
                if (isSuccessful) {
                  successfulTransfers++;
                } else {
                  failedTransfers++;
                }

                if (i > 0) {
                  const prevLeg = route.legs[i - 1];
                  const trainPairKey = `${prevLeg.trainNumber}→${leg.trainNumber}`;
                  trainPairs[trainPairKey] = (trainPairs[trainPairKey] || 0) + 1;
                }
              }
            }
          }
        });
      }
    });

    const avgWaitingTime = totalTransfers > 0 ? totalWaitingTime / totalTransfers : 0;
    const successRate = totalTransfers > 0 ? (successfulTransfers / totalTransfers) * 100 : 0;

    const topTrainPairs = Object.entries(trainPairs)
      .map(([pair, count]) => ({ trainPair: pair, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      stationCode: code,
      totalTransfers,
      successfulTransfers,
      failedTransfers,
      successRate: Math.round(successRate * 10) / 10,
      avgWaitingTime: Math.round(avgWaitingTime),
      topTrainPairs,
    });
  } catch (error) {
    console.error('Error fetching station details:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
