"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const projectRoutes_1 = __importDefault(require("./routes/projectRoutes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 8080;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/projects', projectRoutes_1.default);
// Health Check
app.get('/health', (req, res) => {
    res.status(200).send('CLIMB Backend is healthy');
});
// Start Server
app.listen(port, () => {
    console.log(`CLIMB Backend running on port ${port}`);
});
//# sourceMappingURL=index.js.map