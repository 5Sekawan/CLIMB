import { Request, Response } from 'express';
export declare class ProjectController {
    /**
     * Endpoint to trigger 3D Grade Prediction for an AOI
     */
    static createInference(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Placeholder for Simulation (Phase 4)
     */
    static simulateParameters(req: Request, res: Response): Promise<void>;
    /**
     * Placeholder for Actual Data Input (Phase 5)
     */
    static submitActuals(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=projectController.d.ts.map