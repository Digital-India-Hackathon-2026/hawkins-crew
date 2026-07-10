import { NextResponse } from 'next/server';

const MOCK_STATION_ROUTES: Record<string, string[]> = {
  'NDLS': ['NDLS', 'AGC', 'BPL', 'NGP', 'PUNE'],
  'CSMT': ['CSMT', 'PUNE', 'BPL', 'NGP', 'NDLS'],
  'PUNE': ['PUNE', 'BPL', 'NDLS'],
  'AGC': ['AGC', 'NDLS', 'JP'],
  'default': ['NDLS', 'AGC', 'JP', 'BPL', 'NGP'],
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { stationCode, trainNumbers, maxShiftMinutes = 10 } = body;

    await new Promise(resolve => setTimeout(resolve, 2000));

    const mockBeforeMetrics = {
      avgWaitingTime: 45,
      successRate: 72,
      totalTransfers: 156,
      problematicConnections: 23,
    };

    const mockAfterMetrics = {
      avgWaitingTime: 28,
      successRate: 89,
      totalTransfers: 156,
      problematicConnections: 7,
    };

    const routeStations = MOCK_STATION_ROUTES[stationCode] || MOCK_STATION_ROUTES['default'];

    const mockRecommendedChanges = trainNumbers.map((trainNumber: string, idx: number) => {
      const baseHour = 14 + idx;
      const baseMinute = 30;
      const shiftMinutes = Math.floor(Math.random() * 10) + 3;
      const newMinute = baseMinute + shiftMinutes;

      return {
        trainNumber,
        trainName: `Express ${trainNumber}`,
        currentDeparture: `${baseHour.toString().padStart(2, '0')}:${baseMinute.toString().padStart(2, '0')}`,
        recommendedDeparture: `${baseHour.toString().padStart(2, '0')}:${newMinute.toString().padStart(2, '0')}`,
        shiftMinutes,
        reason: idx % 2 === 0 ? `Improve connection window at ${stationCode}` : `Reduce transfer conflicts at ${stationCode}`,
        impactedConnections: Math.floor(Math.random() * 10) + 5,
        improvementScore: Math.floor(Math.random() * 30) + 60,
        route: routeStations,
        stopsAt: routeStations.map((station, sIdx) => ({
          stationCode: station,
          arrivalBefore: sIdx === 0 ? null : `${(baseHour + Math.floor(sIdx * 1.5)).toString().padStart(2, '0')}:${(baseMinute + (sIdx * 15) % 60).toString().padStart(2, '0')}`,
          departureBefore: sIdx === routeStations.length - 1 ? null : `${(baseHour + Math.floor(sIdx * 1.5)).toString().padStart(2, '0')}:${(baseMinute + (sIdx * 15 + 5) % 60).toString().padStart(2, '0')}`,
          arrivalAfter: sIdx === 0 ? null : `${(baseHour + Math.floor(sIdx * 1.5)).toString().padStart(2, '0')}:${((baseMinute + shiftMinutes) + (sIdx * 15) % 60).toString().padStart(2, '0')}`,
          departureAfter: sIdx === routeStations.length - 1 ? null : `${(baseHour + Math.floor(sIdx * 1.5)).toString().padStart(2, '0')}:${((baseMinute + shiftMinutes) + (sIdx * 15 + 5) % 60).toString().padStart(2, '0')}`,
        })),
      };
    });

    return NextResponse.json({
      stationCode,
      maxShiftMinutes,
      before: mockBeforeMetrics,
      after: mockAfterMetrics,
      recommendedChanges: mockRecommendedChanges,
      recommendations: [
        {
          id: '1',
          type: 'timing',
          priority: 'high',
          title: 'Adjust departure time for Train 12345',
          description: 'Shifting departure by 5 minutes would improve 8 critical connections',
          estimatedImpact: '+12% success rate',
          affectedTrains: ['12345', '12346'],
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          type: 'platform',
          priority: 'medium',
          title: 'Optimize platform allocation',
          description: 'Assigning adjacent platforms would reduce transfer time by 3 minutes',
          estimatedImpact: '+8% success rate',
          affectedTrains: ['12347', '12348'],
          createdAt: new Date().toISOString(),
        },
      ],
    });
  } catch (error) {
    console.error('Error running optimization:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
