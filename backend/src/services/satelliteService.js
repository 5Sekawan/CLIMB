"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SatelliteService = void 0;
const earthengine_1 = __importDefault(require("@google/earthengine"));
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class SatelliteService {
    static isInitialized = false;
    /**
     * Initializes Earth Engine using a service account key
     */
    static async initialize() {
        if (this.isInitialized)
            return;
        return new Promise((resolve, reject) => {
            try {
                const key = JSON.parse(fs_1.default.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8'));
                earthengine_1.default.data.authenticateViaPrivateKey(key, () => {
                    earthengine_1.default.initialize(null, null, () => {
                        this.isInitialized = true;
                        console.log('Google Earth Engine initialized successfully');
                        resolve(true);
                    }, (err) => reject(err));
                }, (err) => reject(err));
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Extracts average NDVI for a given polygon
     */
    static async getNDVI(geometry) {
        await this.initialize();
        // Convert GeoJSON geometry to EE Geometry
        const eeGeom = earthengine_1.default.Geometry(geometry);
        // Get Sentinel-2 Image Collection
        const dataset = earthengine_1.default.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
            .filterBounds(eeGeom)
            .filter(earthengine_1.default.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
            .median();
        // Calculate NDVI: (NIR - Red) / (NIR + Red) -> B8 and B4
        const ndvi = dataset.normalizedDifference(['B8', 'B4']).rename('NDVI');
        // Reduce to average value in AOI
        const stats = ndvi.reduceRegion({
            reducer: earthengine_1.default.Reducer.mean(),
            geometry: eeGeom,
            scale: 10,
            maxPixels: 1e9
        });
        return new Promise((resolve) => {
            stats.evaluate((result) => {
                resolve(result?.NDVI || 0);
            });
        });
    }
    /**
     * Extracts average Thermal Anomaly (Land Surface Temp) for a given polygon
     */
    static async getThermalAnomaly(geometry) {
        await this.initialize();
        const eeGeom = earthengine_1.default.Geometry(geometry);
        // Get Landsat-8 Thermal Band (B10)
        const dataset = earthengine_1.default.ImageCollection('LANDSAT/LC08/C02/T1_L2')
            .filterBounds(eeGeom)
            .filter(earthengine_1.default.Filter.lt('CLOUD_COVER', 10))
            .median();
        const thermal = dataset.select('ST_B10').multiply(0.00341802).add(149.0).subtract(273.15); // Convert to Celsius
        const stats = thermal.reduceRegion({
            reducer: earthengine_1.default.Reducer.mean(),
            geometry: eeGeom,
            scale: 30,
            maxPixels: 1e9
        });
        return new Promise((resolve) => {
            stats.evaluate((result) => {
                resolve(result?.ST_B10 || 0);
            });
        });
    }
}
exports.SatelliteService = SatelliteService;
//# sourceMappingURL=satelliteService.js.map