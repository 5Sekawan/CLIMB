"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectController = void 0;
const express_1 = require("express");
const inferenceService_1 = require("../services/inferenceService");
class ProjectController {
    /**
     * Endpoint to trigger 3D Grade Prediction for an AOI
     */
    static async createInference(req, res) {
        try {
            const { name, polygon } = req.body;
            if (!name || !polygon || !Array.isArray(polygon)) {
                return res.status(400).json({ error: 'Missing name or polygon coordinates' });
            }
            console.log(`Starting inference for project: ${name}`);
            const voxelData = await inferenceService_1.InferenceService.predictGrade(name, polygon);
            res.status(200).json({
                success: true,
                project: name,
                voxelCount: voxelData.length,
                data: voxelData
            });
        }
        catch (error) {
            console.error('Controller Error:', error);
            res.status(500).json({ error: error.message });
        }
    }
    /**
     * Placeholder for Simulation (Phase 4)
     */
    static async simulateParameters(req, res) {
        res.status(501).json({ message: 'Simulation logic not yet implemented' });
    }
    /**
     * Placeholder for Actual Data Input (Phase 5)
     */
    static async submitActuals(req, res) {
        res.status(501).json({ message: 'Reconciliation logic not yet implemented' });
    }
}
exports.ProjectController = ProjectController;
//# sourceMappingURL=projectController.js.map