import mongoose, { Schema, Document } from 'mongoose';

export interface IDocument extends Document {
  filename: string;
  storedName: string; // Name in GCS/Local storage
  size: number; // bytes
  chunkCount: number;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  metadata?: Record<string, any>; // Extra info like page count, author
  uploadedAt: Date;
}

const DocumentSchema = new Schema<IDocument>({
  filename: { type: String, required: true },
  storedName: { type: String, required: true },
  size: { type: Number, required: true },
  chunkCount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['uploading', 'processing', 'ready', 'error'],
    default: 'uploading'
  },
  metadata: { type: Schema.Types.Mixed },
  uploadedAt: { type: Date, default: Date.now }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

export const DocumentModel = mongoose.model<IDocument>('Document', DocumentSchema);
