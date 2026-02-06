import { bigquery } from '../config/gcp';
import dotenv from 'dotenv';

dotenv.config();

const datasetId = process.env.BQ_DATASET_ID;
const tableId = process.env.BQ_TABLE_EXTERNAL_DATA;

export class ExternalDataService {
  /**
   * Fetches the nearest mineral deposit data from Kaggle dataset in BigQuery
   */
  static async getNearestDeposits(lat: number, lon: number, limit: number = 10): Promise<any[]> {
    try {
      const query = `
        SELECT site_name, mineral_type, grade, unit, source,
               ST_DISTANCE(geom, ST_GEOGPOINT(${lon}, ${lat})) as distance_meters
        FROM \`${datasetId}.${tableId}\`
        ORDER BY distance_meters ASC
        LIMIT ${limit}
      `;

      const [rows] = await bigquery.query({ query });
      return rows;
    } catch (error) {
      console.error('Error fetching nearest deposits:', error);
      return [];
    }
  }
}
