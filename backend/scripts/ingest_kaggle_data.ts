import fs from 'fs';
import { parse } from 'csv-parse';
import { BigQuery } from '@google-cloud/bigquery';
import dotenv from 'dotenv';
import path from 'path';

// Load environment from backend .env
// Current dir: backend/scripts
// Target: backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const projectId = process.env.GCP_PROJECT_ID;
const datasetId = process.env.BQ_DATASET_ID; // e.g. climb_dev_1
const tableId = process.env.BQ_TABLE_EXTERNAL_DATA; // external_mineral_data

// Key is relative to backend root in .env (e.g. ./config/...)
const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS 
  ? path.resolve(__dirname, '../', process.env.GOOGLE_APPLICATION_CREDENTIALS) 
  : undefined;

if (!projectId || !datasetId || !tableId) {
  console.error('Missing BigQuery configuration in .env');
  process.exit(1);
}

const bigquery = new BigQuery({ projectId, keyFilename });

const TARGET_COMMODITIES = ['Gold', 'Copper', 'Silver', 'Nickel', 'Iron', 'Tin', 'Molybdenum', 'Zinc', 'Lead', 'Manganese'];

async function ensureTableExists() {
  try {
    const dataset = bigquery.dataset(datasetId!);
    
    try {
      await dataset.create({ location: process.env.GCP_LOCATION || 'asia-southeast1' });
      console.log(`Dataset ${datasetId} created.`);
    } catch (e: any) {
      // 409 = Already Exists. 403 = Access Denied (might exist but we can't check).
      if (e.code === 409) {
        console.log(`Dataset ${datasetId} already exists.`);
      } else {
        console.warn(`Warning creating dataset: ${e.message}`);
        // We continue, hoping the dataset exists and we have table permissions.
      }
    }

    const table = dataset.table(tableId!);
    
    const schema = [
      { name: 'site_name', type: 'STRING' },
      { name: 'latitude', type: 'FLOAT' },
      { name: 'longitude', type: 'FLOAT' },
      { name: 'geom', type: 'GEOGRAPHY' },
      { name: 'mineral_type', type: 'STRING' },
      { name: 'grade', type: 'FLOAT' },
      { name: 'unit', type: 'STRING' },
      { name: 'source', type: 'STRING' },
      { name: 'metadata', type: 'JSON' }
    ];

    try {
      await table.create({ schema });
      console.log(`Table ${tableId} created successfully.`);
    } catch (e: any) {
      if (e.code === 409) {
        console.log(`Table ${tableId} already exists. Checking schema...`);
        const [meta] = await table.getMetadata();
        const hasMetadataCol = meta.schema.fields.some((f: any) => f.name === 'metadata');
        
        if (!hasMetadataCol) {
          console.log(`Schema mismatch detected: 'metadata' column is missing. Recreating table ${tableId}...`);
          await table.delete();
          await table.create({ schema });
          console.log(`Table ${tableId} recreated with correct schema.`);
        } else {
          console.log(`Schema check passed.`);
        }
      } else {
        throw e;
      }
    }

  } catch (error) {
    console.error('Error ensuring infrastructure:', error);
    // process.exit(1); // Don't exit yet, try insertion.
  }
}

async function ingestData() {
  await ensureTableExists();

  // Dataset is at root/dataset/
  // Current: root/backend/scripts
  // Path: ../../dataset/
  const csvPath = path.resolve(__dirname, '../../dataset/climb-mineral-data.csv');
  console.log(`Reading dataset from: ${csvPath}`);

  const rowsToInsert: any[] = [];
  let count = 0;

  const parser = fs.createReadStream(csvPath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })
  );

  for await (const record of parser) {
    // 1. Filter by Commodity
    const commod1 = record.commod1 || '';
    if (!TARGET_COMMODITIES.some(c => commod1.includes(c))) {
      continue;
    }

    // 2. Validate Coordinates
    const lat = parseFloat(record.latitude);
    const lon = parseFloat(record.longitude);
    if (isNaN(lat) || isNaN(lon)) continue;

    // 3. Construct Metadata (Qualitative Data)
    const metadata = {
      dep_type: record.dep_type || null,
      dev_stat: record.dev_stat || null,
      ore: record.ore || null,
      gangue: record.gangue || null,
      hrock_type: record.hrock_type || null,
      commod1: record.commod1,
      commod2: record.commod2,
      commod3: record.commod3
    };

    // 4. Map to BigQuery Schema
    rowsToInsert.push({
      site_name: record.site_name || 'Unknown Site',
      latitude: lat,
      longitude: lon,
      geom: bigquery.geography(`POINT(${lon} ${lat})`),
      mineral_type: commod1,
      grade: null, // Dataset has no numeric grade
      unit: null,
      source: 'USGS_MRDS_Kaggle',
      metadata: JSON.stringify(metadata)
    });

    count++;
    if (rowsToInsert.length >= 1000) {
      await insertBatch(rowsToInsert.splice(0, 1000));
      console.log(`Processed ${count} records...`);
    }
  }

  if (rowsToInsert.length > 0) {
    await insertBatch(rowsToInsert);
  }

  console.log(`Ingestion complete! Total records: ${count}`);
}

async function insertBatch(rows: any[]) {
  try {
    await bigquery
      .dataset(datasetId!)
      .table(tableId!)
      .insert(rows);
  } catch (error: any) {
    if (error.name === 'PartialFailureError') {
      console.error('Partial failure:', error.errors?.[0]);
    } else {
      console.error('Insert error:', error);
    }
  }
}

ingestData().catch(console.error);
