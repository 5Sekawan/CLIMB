"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const projectController_1 = require("../controllers/projectController");
const router = (0, express_1.Router)();
// Phase 3: Inference
router.post('/predict', projectController_1.ProjectController.createInference);
// Phase 4: Simulation
router.post('/simulate', projectController_1.ProjectController.simulateParameters);
// Phase 5: Reconciliation
router.post('/actuals', projectController_1.ProjectController.submitActuals);
exports.default = router;
//# sourceMappingURL=projectRoutes.js.map