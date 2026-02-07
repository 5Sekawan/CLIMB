import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLog extends Document {
  type: 'inference' | 'production' | 'reconciliation' | 'system';
  message: string;
  projectId?: string;
  projectName?: string; // Denormalized for quick display
  meta?: Record<string, any>;
  timestamp: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>({
  type: {
    type: String,
    enum: ['inference', 'production', 'reconciliation', 'system'],
    required: true
  },
  message: { type: String, required: true },
  projectId: { type: String, index: true },
  projectName: { type: String },
  meta: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now, index: -1 } // Descending index for feed
});

export const ActivityLog = mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
