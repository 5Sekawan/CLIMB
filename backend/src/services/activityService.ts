import { ActivityLog, IActivityLog } from '../models/ActivityLog';

export class ActivityService {
  /**
   * Logs a new activity to the database.
   * Designed to be fire-and-forget (non-blocking) if needed.
   */
  static async log(
    type: IActivityLog['type'],
    message: string,
    projectId?: string,
    projectName?: string,
    meta?: Record<string, any>
  ): Promise<void> {
    try {
      await ActivityLog.create({
        type,
        message,
        projectId,
        projectName,
        meta,
        timestamp: new Date()
      });
      console.log(`[Activity] [${type}] ${message}`);
    } catch (error) {
      console.error('Failed to create activity log:', error);
      // We do not throw here to prevent disrupting the main flow
    }
  }

  /**
   * Retrieves the latest activity logs.
   */
  static async getRecentActivity(limit: number = 20): Promise<IActivityLog[]> {
    return ActivityLog.find()
      .sort({ timestamp: -1 })
      .limit(limit);
  }
}
