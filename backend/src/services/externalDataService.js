"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalDataService = void 0;
const gcp_1 = require("../config/gcp");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const datasetId = process.env.BQ_DATASET_ID;
const tableId = process.env.BQ_TABLE_EXTERNAL_DATA;
class ExternalDataService {
    /**
     * Fetches the nearest mineral deposit data from Kaggle dataset in BigQuery
     */
    static async getNearestDeposits(lat, lon, limit = 10) {
        try {
            const query = `
        SELECT site_name, mineral_type, grade, unit, source,
               ST_DISTANCE(geom, ST_GEOGPOINT(${lon}, ${lat})) as distance_meters
        FROM 
        ORDER BY distance_meters ASC
        LIMIT ${limit}
      `;
            const [rows] = await gcp_1.bigquery.query({ query });
            return rows;
        }
        catch (error) {
            console.error('Error fetching nearest deposits:', error);
            return [];
        }
    }
}
exports.ExternalDataService = ExternalDataService;
//# sourceMappingURL=externalDataService.js.map