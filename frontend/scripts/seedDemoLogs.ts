import mongoose from 'mongoose';
import { JourneySearchLog } from '../lib/models/JourneySearchLog';
import connectToDatabase from '../lib/db';

const INDIAN_STATIONS = [
  { code: 'NDLS', name: 'New Delhi' },
  { code: 'CSMT', name: 'Chhatrapati Shivaji Maharaj Terminus' },
  { code: 'BCT', name: 'Mumbai Central' },
  { code: 'MAS', name: 'Chennai Central' },
  { code: 'HWH', name: 'Howrah Junction' },
  { code: 'PUNE', name: 'Pune Junction' },
  { code: 'AGC', name: 'Agra Cantt' },
  { code: 'JP', name: 'Jaipur' },
  { code: 'BPL', name: 'Bhopal Junction' },
  { code: 'NGP', name: 'Nagpur' },
];

const TRAIN_NUMBERS = [
  '12301', '12302', '12345', '12346', '12347', '12348', '12349',
  '12128', '12130', '17234', '12002', '12004', '12951', '12952',
  '12431', '12432', '12615', '12616', '12723', '12724',
];

function randomStation() {
  return INDIAN_STATIONS[Math.floor(Math.random() * INDIAN_STATIONS.length)];
}

function randomTrain() {
  return TRAIN_NUMBERS[Math.floor(Math.random() * TRAIN_NUMBERS.length)];
}

function randomDate() {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 30);
  return new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
}

function generateDemoLog() {
  const source = randomStation();
  let destination = randomStation();
  while (destination.code === source.code) {
    destination = randomStation();
  }

  const numTransfers = Math.random() < 0.3 ? 0 : Math.random() < 0.7 ? 1 : 2;
  const legs = [];

  let currentStation = source.code;
  for (let i = 0; i <= numTransfers; i++) {
    const trainNumber = randomTrain();
    const toStation = i === numTransfers ? destination.code : randomStation().code;

    const leg: any = {
      trainNumber,
      trainName: `Express ${trainNumber}`,
      fromStation: currentStation,
      toStation: toStation,
      distanceCovered: Math.floor(Math.random() * 500) + 100,
      duration: Math.floor(Math.random() * 300) + 60,
      runningDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    };

    if (i > 0) {
      const waitingDuration = Math.floor(Math.random() * 60) + 10;
      const feasibilityScore = Math.random() < 0.75 ? Math.floor(Math.random() * 30) + 70 : Math.floor(Math.random() * 40) + 30;

      leg.transfer = {
        stationCode: currentStation,
        waitingDuration,
        platform: Math.random() < 0.5 ? `${Math.floor(Math.random() * 10) + 1}` : undefined,
        feasibilityScore,
      };
    }

    legs.push(leg);
    currentStation = toStation;
  }

  const totalTravelTime = legs.reduce((sum, leg) => sum + (leg.duration || 0), 0);
  const totalWaitingTime = legs.reduce((sum, leg) => sum + (leg.transfer?.waitingDuration || 0), 0);

  return {
    sourceStation: source,
    destinationStation: destination,
    dateOfJourney: randomDate(),
    dayOfWeek: Math.floor(Math.random() * 7),
    searchParameters: {
      optimizationObjective: 'DEFAULT' as const,
    },
    performanceMetrics: {
      executionTimeMs: Math.floor(Math.random() * 1000) + 500,
      candidateRoutesEvaluated: Math.floor(Math.random() * 10) + 3,
    },
    routes: [
      {
        rank: 1,
        totalTravelTime,
        totalWaitingTime,
        numberOfTransfers: numTransfers,
        overallScore: Math.floor(Math.random() * 50) + 50,
        isRecommended: true,
        legs,
      },
    ],
    status: {
      isSuccess: true,
    },
    metadata: {
      apiVersion: '1.0',
      clientIp: '192.168.1.' + Math.floor(Math.random() * 255),
      device: 'Desktop',
      browser: 'Chrome',
    },
  };
}

async function seedDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await connectToDatabase();

    console.log('Clearing existing demo logs...');
    await JourneySearchLog.deleteMany({});

    console.log('Generating 50 demo journey search logs...');
    const demoLogs = [];
    for (let i = 0; i < 50; i++) {
      demoLogs.push(generateDemoLog());
    }

    console.log('Inserting demo logs into database...');
    await JourneySearchLog.insertMany(demoLogs);

    console.log('✅ Successfully seeded 50 demo journey search logs!');

    const stats = await JourneySearchLog.aggregate([
      {
        $unwind: '$routes',
      },
      {
        $unwind: '$routes.legs',
      },
      {
        $match: {
          'routes.legs.transfer': { $exists: true },
        },
      },
      {
        $group: {
          _id: null,
          totalTransfers: { $sum: 1 },
          successfulTransfers: {
            $sum: {
              $cond: [{ $gte: ['$routes.legs.transfer.feasibilityScore', 70] }, 1, 0],
            },
          },
        },
      },
    ]);

    if (stats.length > 0) {
      console.log(`\nStats:`);
      console.log(`- Total transfers: ${stats[0].totalTransfers}`);
      console.log(`- Successful transfers: ${stats[0].successfulTransfers}`);
      console.log(`- Success rate: ${Math.round((stats[0].successfulTransfers / stats[0].totalTransfers) * 100)}%`);
    }

    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
