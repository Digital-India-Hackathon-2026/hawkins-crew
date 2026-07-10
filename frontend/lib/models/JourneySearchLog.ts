import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStation {
  code: string;
  name: string;
}

export interface IJourneyLeg {
  trainNumber: string;
  trainName?: string;
  fromStation: string;
  toStation: string;
  distanceCovered?: number;
  duration?: number; // in minutes
  runningDays?: string[];
  
  // Transfer details prior to this leg (if it's not the first leg)
  transfer?: {
    stationCode: string;
    waitingDuration: number; // in minutes
    platform?: string;
    feasibilityScore?: number;
  };
}

export interface IRoute {
  rank: number;
  totalTravelTime: number; // in minutes
  totalWaitingTime: number; // in minutes
  numberOfTransfers: number;
  overallScore: number;
  isRecommended: boolean;
  legs: IJourneyLeg[];
}

export interface ISearchLog extends Document {
  sourceStation: IStation;
  destinationStation: IStation;
  dateOfJourney: Date;
  dayOfWeek: number; // 0 (Sun) to 6 (Sat)
  userId?: string | mongoose.Types.ObjectId;
  sessionId?: string;
  
  searchParameters: {
    maxTransfers?: number;
    maxWaitingTime?: number;
    optimizationObjective: 'MIN_TRAVEL_TIME' | 'MIN_TRANSFERS' | 'BALANCED' | 'CHEAPEST' | 'DEFAULT';
    filters?: string[];
  };
  
  performanceMetrics: {
    executionTimeMs: number;
    candidateRoutesEvaluated: number;
  };
  
  routes: IRoute[];
  
  status: {
    isSuccess: boolean;
    failureReason?: string;
  };
  
  metadata: {
    apiVersion: string;
    clientIp?: string;
    device?: string;
    browser?: string;
    appVersion?: string;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

const StationSchema = new Schema<IStation>({
  code: { type: String, required: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true }
}, { _id: false });

const TransferDetailsSchema = new Schema({
  stationCode: { type: String, required: true, uppercase: true },
  waitingDuration: { type: Number, required: true, min: 0 },
  platform: { type: String },
  feasibilityScore: { type: Number, min: 0, max: 100 }
}, { _id: false });

const JourneyLegSchema = new Schema<IJourneyLeg>({
  trainNumber: { type: String, required: true },
  trainName: { type: String, required: false },
  fromStation: { type: String, required: true, uppercase: true },
  toStation: { type: String, required: true, uppercase: true },
  distanceCovered: { type: Number, required: false, min: 0 },
  duration: { type: Number, required: false, min: 0 },
  runningDays: [{ type: String }],
  transfer: { type: TransferDetailsSchema, required: false }
}, { _id: false });

const RouteSchema = new Schema<IRoute>({
  rank: { type: Number, required: true, min: 1 },
  totalTravelTime: { type: Number, required: true, min: 0 },
  totalWaitingTime: { type: Number, required: true, min: 0 },
  numberOfTransfers: { type: Number, required: true, min: 0 },
  overallScore: { type: Number, required: true },
  isRecommended: { type: Boolean, default: false },
  legs: { 
    type: [JourneyLegSchema], 
    required: true,
    validate: {
      validator: function(v: any[]) {
        return v && v.length > 0;
      },
      message: 'Route must have at least one leg'
    }
  }
}, { _id: false });

const JourneySearchLogSchema = new Schema<ISearchLog>({
  sourceStation: { type: StationSchema, required: true },
  destinationStation: { type: StationSchema, required: true },
  dateOfJourney: { type: Date, required: true },
  dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
  userId: { type: Schema.Types.Mixed, index: true }, // Mixed to support both String (UUID) and ObjectId
  sessionId: { type: String, index: true },
  
  searchParameters: {
    maxTransfers: { type: Number, min: 0 },
    maxWaitingTime: { type: Number, min: 0 },
    optimizationObjective: { 
      type: String, 
      required: true,
      enum: ['MIN_TRAVEL_TIME', 'MIN_TRANSFERS', 'BALANCED', 'CHEAPEST', 'DEFAULT'],
      default: 'DEFAULT'
    },
    filters: [{ type: String }]
  },
  
  performanceMetrics: {
    executionTimeMs: { type: Number, required: true, min: 0 },
    candidateRoutesEvaluated: { type: Number, required: true, min: 0 }
  },
  
  routes: { type: [RouteSchema], default: [] },
  
  status: {
    isSuccess: { type: Boolean, required: true },
    failureReason: { type: String }
  },
  
  metadata: {
    apiVersion: { type: String, required: true },
    clientIp: { type: String },
    device: { type: String },
    browser: { type: String },
    appVersion: { type: String }
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
  collection: 'journeySearchLogs'
});

// Indexes for frequently queried fields
JourneySearchLogSchema.index({ 'sourceStation.code': 1 });
JourneySearchLogSchema.index({ 'destinationStation.code': 1 });
JourneySearchLogSchema.index({ dateOfJourney: 1 });
JourneySearchLogSchema.index({ createdAt: -1 });
// Compound index for analyzing routes between two stations
JourneySearchLogSchema.index({ 'sourceStation.code': 1, 'destinationStation.code': 1, createdAt: -1 });

export const JourneySearchLog: Model<ISearchLog> = mongoose.models?.JourneySearchLog || mongoose.model<ISearchLog>('JourneySearchLog', JourneySearchLogSchema);
