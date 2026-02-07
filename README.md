# CLIMB: Closed-Loop Intelligence for Mining Blocks

A Unified Platform Bridging Strategic Resource Modeling and Operational Reality through Hybrid AI.

## Overview

CLIMB is an end-to-end intelligence platform designed to address the critical reconciliation gap in the mining industry. It integrates geospatial data, satellite imagery, and generative AI to create dynamic 3D resource models that evolve with daily production data.

Unlike traditional static block models, CLIMB utilizes a Closed-Loop System:
1. Predicts mineral grades using Hybrid AI (Gemini 1.5 Pro + Earth Engine + Kaggle Data).
2. Optimizes excavation boundaries (Dig-lines) in real-time based on economic parameters.
3. Learns from actual lab results to continuously correct model bias and drift.

## Key Features

### 1. Hybrid AI Spatial Intelligence
Generates 3D voxel models of mineral distribution without expensive initial drilling campaigns by synthesizing:
- Satellite Imagery (Google Earth Engine): NDVI (Vegetation), Thermal Anomalies, and SWIR (Alteration Zones).
- Geological Knowledge (RAG): Extracts insights from PDF technical reports using Vector Search.
- Global Analogues: Correlates with historical deposit data from USGS/Kaggle.

### 2. Operational Cockpit
Empowers mine engineers to make data-driven decisions immediately:
- Dynamic Cut-off Grade (COG): Visualize how changing economic factors impact ore tonnage and net value instantly.
- 3D Visualization: Interactive map to explore the block model in detail.

### 3. Reconciliation Lab
The core of the Closed-Loop engine:
- Drift Detection: Automatically flags when the model deviates from actual production data.
- Recursive Learning: Uses Generative AI to analyze why the model failed and injects this "Lesson Learned" back into the Knowledge Base for future predictions.

## Technical Architecture

CLIMB is built on a robust, cloud-native stack designed for scalability and heavy geospatial processing.

- Frontend: Next.js 16 (App Router, React Query, Deck.gl for 3D maps).
- Backend: Node.js with Express and TypeScript.
- Database: MongoDB (Metadata) and BigQuery GIS (Geospatial & Vector Data).
- AI Engine: Vertex AI (Gemini 1.5 Pro & Embeddings).
- Satellite Data: Google Earth Engine.
- Infrastructure: Google Cloud Compute Engine and Docker.

## Installation & Setup

### Prerequisites
- Node.js v20+
- Docker & Docker Compose
- Google Cloud Project with Vertex AI, BigQuery, and Earth Engine APIs enabled.

### 1. Clone Repository
Clone the repository to your local machine.

### 2. Backend Setup
Navigate to the backend directory. Copy the environment example file to a new .env file and fill in your Google Cloud credentials. You will need a Service Account JSON key for GEE and Vertex AI. Then install the dependencies and start the development server.

### 3. Frontend Setup
Navigate to the frontend directory. Copy the environment example file to a new .env file and add your Google Maps API Key. Install the dependencies and start the application.

### 4. Database Initialization
Ensure your MongoDB instance is running (via Docker) and BigQuery datasets are created using the provided initialization scripts in the scripts folder.

## Testing the Loop

1. Create Project: Go to Explorer and create a new AOI by drawing a polygon on the map.
2. Run Inference: Click the "Run AI Inference" button in the Intelligence Panel. Wait for the system to generate the voxel model.
3. Simulate: Use the bottom slider to adjust Cut-off Grade and see the economic impact.
4. Reconcile: Go to the Reconciliation Lab, upload a CSV of actual drill hole data, and watch the system detect bias and generate a lesson learned.

## Team Members

| Group Name | Member Name |
| :--- | :--- |
| **5 sekawan mwncari cuan** | I Nyoman Rai Dharma Wiguna |
| | Luh Puniayogi Suaryani |
| | Muhammad Khalfani Shaquille Indrajaya |
| | Nur'aini Fauziah Zahra |
| | Sebastian Albern Nugroho |
