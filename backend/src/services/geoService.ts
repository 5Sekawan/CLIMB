/**
 * GeoService - Google Maps API Integration
 * 
 * Provides reverse geocoding (coordinates → location name) and
 * elevation data using Google Maps Platform APIs.
 */

import axios from 'axios';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

interface GeocodingResult {
    city?: string;
    region?: string;
    country?: string;
    formatted: string;
}

interface ElevationResult {
    min: number;
    max: number;
    formatted: string;
}

export class GeoService {
    private static readonly GEOCODING_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
    private static readonly ELEVATION_URL = 'https://maps.googleapis.com/maps/api/elevation/json';

    /**
     * Reverse geocode coordinates to get city, region, and country
     * @param lat Latitude
     * @param lng Longitude
     * @returns Formatted location string (e.g., "Bandung, West Java, Indonesia")
     */
    static async reverseGeocode(lat: number, lng: number): Promise<string> {
        if (!GOOGLE_MAPS_API_KEY) {
            console.warn('[GeoService] GOOGLE_MAPS_API_KEY not set, using fallback');
            return 'Unknown Location';
        }

        try {
            const response = await axios.get(this.GEOCODING_URL, {
                params: {
                    latlng: `${lat},${lng}`,
                    key: GOOGLE_MAPS_API_KEY,
                    language: 'en',
                    result_type: 'locality|administrative_area_level_1|country'
                }
            });

            if (response.data.status !== 'OK' || !response.data.results?.length) {
                console.warn('[GeoService] Geocoding returned no results:', response.data.status);
                return 'Unknown Location';
            }

            // Parse address components
            const result = this.parseGeocodingResponse(response.data.results);
            console.log(`[GeoService] Geocoded (${lat}, ${lng}) → ${result.formatted}`);
            return result.formatted;

        } catch (error: any) {
            console.error('[GeoService] Geocoding error:', error.message);
            return 'Unknown Location';
        }
    }

    /**
     * Parse Google Geocoding API response to extract city, region, country
     */
    private static parseGeocodingResponse(results: any[]): GeocodingResult {
        let city: string | undefined;
        let region: string | undefined;
        let country: string | undefined;

        // Iterate through all results to find the best components
        for (const result of results) {
            for (const component of result.address_components || []) {
                const types = component.types || [];

                if (types.includes('locality') && !city) {
                    city = component.long_name;
                }
                if (types.includes('administrative_area_level_2') && !city) {
                    city = component.long_name; // Fallback to level 2 if no locality
                }
                if (types.includes('administrative_area_level_1') && !region) {
                    region = component.long_name;
                }
                if (types.includes('country') && !country) {
                    country = component.long_name;
                }
            }
        }

        // Build formatted string
        const parts = [city, region, country].filter(Boolean);
        const formatted = parts.length > 0 ? parts.join(', ') : 'Unknown Location';

        return { city, region, country, formatted };
    }

    /**
     * Get elevation range for a polygon by sampling its vertices
     * @param coordinates Array of [lng, lat] coordinate pairs
     * @returns Formatted elevation string (e.g., "120-350m ASL")
     */
    static async getElevationRange(coordinates: number[][]): Promise<string> {
        if (!GOOGLE_MAPS_API_KEY) {
            console.warn('[GeoService] GOOGLE_MAPS_API_KEY not set, using fallback');
            return 'Unknown';
        }

        if (!coordinates || coordinates.length === 0) {
            return 'Unknown';
        }

        try {
            // Sample points: use polygon vertices (max 10 to stay within API limits)
            const samplePoints = coordinates.slice(0, 10);
            const locations = samplePoints.map(coord => `${coord[1]},${coord[0]}`).join('|');

            const response = await axios.get(this.ELEVATION_URL, {
                params: {
                    locations,
                    key: GOOGLE_MAPS_API_KEY
                }
            });

            if (response.data.status !== 'OK' || !response.data.results?.length) {
                console.warn('[GeoService] Elevation API returned no results:', response.data.status);
                return 'Unknown';
            }

            const elevations = response.data.results.map((r: any) => r.elevation);
            const result = this.calculateElevationRange(elevations);

            console.log(`[GeoService] Elevation range: ${result.formatted} (from ${elevations.length} points)`);
            return result.formatted;

        } catch (error: any) {
            console.error('[GeoService] Elevation API error:', error.message);
            return 'Unknown';
        }
    }

    /**
     * Calculate min/max elevation and format as string
     */
    private static calculateElevationRange(elevations: number[]): ElevationResult {
        const validElevations = elevations.filter(e => typeof e === 'number' && !isNaN(e));

        if (validElevations.length === 0) {
            return { min: 0, max: 0, formatted: 'Unknown' };
        }

        const min = Math.round(Math.min(...validElevations));
        const max = Math.round(Math.max(...validElevations));

        // Format: if min == max, show single value, otherwise show range
        const formatted = min === max
            ? `${min}m ASL`
            : `${min}-${max}m ASL`;

        return { min, max, formatted };
    }

    /**
     * Get both location and elevation in a single call (convenience method)
     */
    static async getGeoData(centerLat: number, centerLng: number, polygonCoords: number[][]): Promise<{
        location: string;
        elevation: string;
    }> {
        const [location, elevation] = await Promise.all([
            this.reverseGeocode(centerLat, centerLng),
            this.getElevationRange(polygonCoords)
        ]);

        return { location, elevation };
    }
}
