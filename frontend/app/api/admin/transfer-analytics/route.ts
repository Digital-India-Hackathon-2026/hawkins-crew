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

    const allLogs = await JourneySearchLog.find({}).select('routes').lean();

    const stationStats: Record<string, {
      total: number;
      successful: number;
      failed: number;
      totalWaitTime: number;
    }> = {};

    const trainPairStats: Record<string, {
      count: number;
      failures: number;
      successRate: number;
    }> = {};

    allLogs.forEach((log: any) => {
      if (log.routes && Array.isArray(log.routes)) {
        log.routes.forEach((route: any) => {
          if (route.legs && Array.isArray(route.legs)) {
            for (let i = 0; i < route.legs.length; i++) {
              const leg = route.legs[i];
              if (leg.transfer) {
                const stationCode = leg.transfer.stationCode;

                if (!stationStats[stationCode]) {
                  stationStats[stationCode] = {
                    total: 0,
                    successful: 0,
                    failed: 0,
                    totalWaitTime: 0,
                  };
                }

                stationStats[stationCode].total++;
                stationStats[stationCode].totalWaitTime += leg.transfer.waitingDuration || 0;

                const isSuccessful = leg.transfer.feasibilityScore && leg.transfer.feasibilityScore >= 70;
                if (isSuccessful) {
                  stationStats[stationCode].successful++;
                } else {
                  stationStats[stationCode].failed++;
                }

                if (i > 0) {
                  const prevLeg = route.legs[i - 1];
                  const trainPairKey = `${prevLeg.trainNumber}→${leg.trainNumber}`;

                  if (!trainPairStats[trainPairKey]) {
                    trainPairStats[trainPairKey] = {
                      count: 0,
                      failures: 0,
                      successRate: 0,
                    };
                  }

                  trainPairStats[trainPairKey].count++;
                  if (!isSuccessful) {
                    trainPairStats[trainPairKey].failures++;
                  }
                }
              }
            }
          }
        });
      }
    });

    const stationSuccessRates = Object.entries(stationStats).map(([station, stats]) => ({
      station,
      successRate: stats.total > 0 ? (stats.successful / stats.total) * 100 : 0,
      total: stats.total,
      successful: stats.successful,
      failed: stats.failed,
      avgWaitTime: stats.total > 0 ? stats.totalWaitTime / stats.total : 0,
    })).sort((a, b) => b.total - a.total);

    const problematicTrainPairs = Object.entries(trainPairStats)
      .map(([pair, stats]) => {
        const successRate = stats.count > 0 ? ((stats.count - stats.failures) / stats.count) * 100 : 0;
        return {
          trainPair: pair,
          totalAttempts: stats.count,
          failures: stats.failures,
          successRate: Math.round(successRate * 10) / 10,
        };
      })
      .filter(p => p.failures > 0)
      .sort((a, b) => b.failures - a.failures)
      .slice(0, 10);

    return NextResponse.json({
      stationSuccessRates,
      problematicTrainPairs,
    });
  } catch (error) {
    console.error('Error fetching transfer analytics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
