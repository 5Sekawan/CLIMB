import type { Request, Response } from 'express';
import { ActivityService } from '../services/activityService';

export class ActivityController {
  /**
   * GET /api/activity
   * Returns the most recent activity logs.
   */
  static async getRecent(req: Request, res: Response) {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const logs = await ActivityService.getRecentActivity(limit);
      res.status(200).json({ success: true, data: logs });
    } catch (error: any) {
      console.error('Get Activity Error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}
