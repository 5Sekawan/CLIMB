export declare class SatelliteService {
    private static isInitialized;
    /**
     * Initializes Earth Engine using a service account key
     */
    static initialize(): Promise<unknown>;
    /**
     * Extracts average NDVI for a given polygon
     */
    static getNDVI(geometry: any): Promise<number>;
    /**
     * Extracts average Thermal Anomaly (Land Surface Temp) for a given polygon
     */
    static getThermalAnomaly(geometry: any): Promise<number>;
}
//# sourceMappingURL=satelliteService.d.ts.map