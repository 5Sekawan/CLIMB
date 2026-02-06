import ee from '@google/earthengine';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

export class SatelliteService {
  private static isInitialized = false;

  /**
   * Initializes Earth Engine using a service account key
   */
  static async initialize() {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      try {
        const key = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS!, 'utf8'));
        ee.data.authenticateViaPrivateKey(
          key,
          () => {
            ee.initialize(
              null,
              null,
              () => {
                this.isInitialized = true;
                console.log('Google Earth Engine initialized successfully');
                resolve(true);
              },
              (err: any) => reject(err)
            );
          },
          (err: any) => reject(err)
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Extracts average NDVI for a given polygon
   */
  static async getNDVI(geometry: any): Promise<number> {
    await this.initialize();
    
    // Convert GeoJSON geometry to EE Geometry
    const eeGeom = ee.Geometry(geometry);
    
    // Get Sentinel-2 Image Collection
    const dataset = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(eeGeom)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
      .median();

    // Calculate NDVI: (NIR - Red) / (NIR + Red) -> B8 and B4
    const ndvi = dataset.normalizedDifference(['B8', 'B4']).rename('NDVI');

    // Reduce to average value in AOI
    const stats = ndvi.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: eeGeom,
      scale: 10,
      maxPixels: 1e9
    });

    return new Promise((resolve) => {
      stats.evaluate((result: any) => {
        resolve(result?.NDVI || 0);
      });
    });
  }

  /**
   * Extracts average Thermal Anomaly (Land Surface Temp) for a given polygon
   */
  static async getThermalAnomaly(geometry: any): Promise<number> {
    await this.initialize();
    
    const eeGeom = ee.Geometry(geometry);
    
    // Get Landsat-8 Thermal Band (B10)
    const dataset = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
      .filterBounds(eeGeom)
      .filter(ee.Filter.lt('CLOUD_COVER', 10))
      .median();

    const thermal = dataset.select('ST_B10').multiply(0.00341802).add(149.0).subtract(273.15); // Convert to Celsius

    const stats = thermal.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: eeGeom,
      scale: 30,
      maxPixels: 1e9
    });

    return new Promise((resolve) => {
      stats.evaluate((result: any) => {
        resolve(result?.ST_B10 || 0);
      });
    });
  }

  /**
   * Extracts Short-Wave Infrared (SWIR) Ratio for Mineral Alteration Detection
   * Uses Sentinel-2 Bands: B11 (1610nm) and B12 (2190nm)
   * High values may indicate clay minerals or hydrothermal alteration.
   */
  static async getSWIR(geometry: any): Promise<number> {
    await this.initialize();
    
    const eeGeom = ee.Geometry(geometry);
    
    // Get Sentinel-2 Image Collection
    const dataset = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(eeGeom)
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20))
      .median();

    // Calculate SWIR Ratio: B11 / B12
    // Clay minerals often absorb B12 more than B11
    const swirRatio = dataset.select('B11').divide(dataset.select('B12')).rename('SWIR_Ratio');

    const stats = swirRatio.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: eeGeom,
      scale: 20, // Slightly coarser scale for regional alteration
      maxPixels: 1e9
    });

    return new Promise((resolve) => {
      stats.evaluate((result: any) => {
        resolve(result?.SWIR_Ratio || 0);
      });
    });
  }
}
