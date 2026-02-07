// ─────────────────────────────────────────────────────────────
// CLIMB Mock Data Layer
// Simulates backend data that would come from the database.
// Each function here mirrors a future API endpoint / server action.
// ─────────────────────────────────────────────────────────────

export type ProjectStatus = "active" | "finished" | "inactive";
export type DriftStatus = "stable" | "drifting";

// ─── Project (Dashboard level) ────────────────────────────────
export interface ProjectSummary {
  id: string;
  name: string;
  location: string;
  minerals: string[];
  driftStatus: DriftStatus;
  lastInference: string;
  estimatedTonnage: string;
  confidence: number;
  status: ProjectStatus;
}

// ─── Project Detail (Explorer level) ──────────────────────────
export interface ProjectDetail extends ProjectSummary {
  center: string;       // lat/lon string
  area: string;         // km²
  elevation: string;    // meters ASL
  lastSyncedAt: string;
  mineralLayers: MineralLayer[];
  nearestDeposits: NearestDeposit[];
  ragContext: RagContext;
  aiSummary: string;
  baseGradeRange: string;
  depthRange: string;
  cogDefault: number;
  baseTonnage: number;
  baseNetValue: number;
  aoi?: any; // GeoJSON Polygon
}

export interface MineralLayer {
  id: string;
  label: string;
  color: string; // tailwind bg class
}

export interface NearestDeposit {
  name: string;
  distance: string;
  grade: string;
  source: string;
}

export interface RagContext {
  shortText: string;
  longText: string;
  sourceRef: string;
}

// ─── Reconciliation Summary (per-project) ────────────────────
export interface ReconciliationSummary {
  projectId: string;
  projectName: string;
  location: string;
  minerals: string[];
  status: ProjectStatus;
  avgVariance: number;       // g/t or %
  blocksAnalyzed: number;
  blocksDrifting: number;
  blocksStable: number;
  modelBias: "over-estimation" | "under-estimation" | "balanced";
  lessonsInjected: number;
  lastReconciliation: string;
  driftStatus: DriftStatus;
}

// ─── All Projects Data ────────────────────────────────────────
const allProjects: ProjectDetail[] = [
  {
    id: "pit-berau-x",
    name: "Pit Berau X",
    location: "East Kalimantan, Indonesia",
    minerals: ["Au", "Cu", "Ag"],
    driftStatus: "stable",
    lastInference: "2 min ago",
    estimatedTonnage: "1.24M t",
    confidence: 87,
    status: "active",
    center: "1.523\u00B0S, 116.842\u00B0E",
    area: "2.4 km\u00B2",
    elevation: "128-195m ASL",
    lastSyncedAt: "2 min ago",
    mineralLayers: [
      { id: "Au", label: "Gold (Au)", color: "bg-amber-400" },
      { id: "Cu", label: "Copper (Cu)", color: "bg-orange-500" },
      { id: "Ag", label: "Silver (Ag)", color: "bg-slate-400" },
    ],
    nearestDeposits: [
      { name: "Kelian Gold Mine", distance: "12.3 km", grade: "2.8 g/t Au", source: "Kaggle/USGS" },
      { name: "Loa Kulu Deposit", distance: "18.7 km", grade: "1.9 g/t Au", source: "Kaggle/USGS" },
      { name: "Batu Hijau Analog", distance: "24.1 km", grade: "0.44% Cu", source: "Kaggle/MinDat" },
      { name: "Tujuh Bukit", distance: "31.5 km", grade: "3.2 g/t Au", source: "Kaggle/USGS" },
      { name: "Gosowong Reference", distance: "45.2 km", grade: "12.1 g/t Au", source: "Kaggle/USGS" },
    ],
    ragContext: {
      shortText:
        "Based on NI 43-101 Technical Report (2023) for the East Kalimantan region, the target formation exhibits characteristics consistent with epithermal Au-Cu mineralization associated with Tertiary volcanic arc sequences.",
      longText:
        "SWIR spectral analysis reveals strong sericite-illite alteration signatures trending NW-SE, consistent with structural control from the Adang Fault System. Thermal anomaly data from Landsat-8 Band 10 confirms elevated surface temperatures (+2.3K above ambient) in the northern sector.",
      sourceRef: "report_2023.pdf (p.47)",
    },
    aiSummary:
      'This AOI shows high potential for Au mineralization in the central-eastern sector. The convergence of RAG geological knowledge, SWIR alteration patterns, and proximity to known deposits (Kelian, 12.3 km) supports an estimated grade range of 1.8 - 3.4 g/t Au at depths between 15-35m.',
    baseGradeRange: "1.8 - 3.4 g/t Au",
    depthRange: "15-35m",
    cogDefault: 1.5,
    baseTonnage: 1200000,
    baseNetValue: 18000000,
  },
  {
    id: "pit-kalimantan-s2",
    name: "Pit Kalimantan S2",
    location: "South Kalimantan, Indonesia",
    minerals: ["Au", "Cu"],
    driftStatus: "drifting",
    lastInference: "1 hour ago",
    estimatedTonnage: "890K t",
    confidence: 72,
    status: "active",
    center: "3.312\u00B0S, 115.678\u00B0E",
    area: "1.8 km\u00B2",
    elevation: "85-142m ASL",
    lastSyncedAt: "1 hour ago",
    mineralLayers: [
      { id: "Au", label: "Gold (Au)", color: "bg-amber-400" },
      { id: "Cu", label: "Copper (Cu)", color: "bg-orange-500" },
    ],
    nearestDeposits: [
      { name: "Cempaka Alluvial", distance: "8.1 km", grade: "0.5 g/t Au", source: "Kaggle/USGS" },
      { name: "Paringin Deposit", distance: "15.4 km", grade: "1.2 g/t Au", source: "Kaggle/MinDat" },
      { name: "Sungai Tiung", distance: "22.8 km", grade: "0.32% Cu", source: "Kaggle/USGS" },
      { name: "Meratus Belt Reference", distance: "30.6 km", grade: "0.8 g/t Au", source: "Kaggle/USGS" },
      { name: "Batuannam Prospect", distance: "41.0 km", grade: "2.1 g/t Au", source: "Kaggle/MinDat" },
    ],
    ragContext: {
      shortText:
        "Geological mapping of the South Kalimantan region indicates presence of alluvial and hard-rock gold mineralization linked to the Meratus ophiolite belt.",
      longText:
        "Geochemical soil sampling data reveals anomalous Au-As-Sb pathfinder element associations in the SW sector. Structural analysis shows NE-trending thrust faults controlling fluid migration pathways. Model drift (+5.2%) detected in thermal correction layer.",
      sourceRef: "meratus_geology_2024.pdf (p.23)",
    },
    aiSummary:
      'Moderate Au potential identified in the SW-central zone. The Meratus ophiolite belt structural context and pathfinder anomalies suggest a grade window of 0.6 - 1.8 g/t Au. However, model drift is flagged at +5.2% -- recalibration recommended.',
    baseGradeRange: "0.6 - 1.8 g/t Au",
    depthRange: "10-28m",
    cogDefault: 1.0,
    baseTonnage: 890000,
    baseNetValue: 9500000,
  },
  {
    id: "pit-sulawesi-nw",
    name: "Pit Sulawesi NW",
    location: "North Sulawesi, Indonesia",
    minerals: ["Ni", "Co", "Fe"],
    driftStatus: "stable",
    lastInference: "3 hours ago",
    estimatedTonnage: "2.1M t",
    confidence: 91,
    status: "active",
    center: "0.876\u00B0N, 122.341\u00B0E",
    area: "3.6 km\u00B2",
    elevation: "45-110m ASL",
    lastSyncedAt: "3 hours ago",
    mineralLayers: [
      { id: "Ni", label: "Nickel (Ni)", color: "bg-teal-500" },
      { id: "Co", label: "Cobalt (Co)", color: "bg-blue-500" },
      { id: "Fe", label: "Iron (Fe)", color: "bg-red-500" },
    ],
    nearestDeposits: [
      { name: "Sorowako Mine", distance: "45.3 km", grade: "1.8% Ni", source: "Kaggle/USGS" },
      { name: "Pomalaa Deposit", distance: "62.1 km", grade: "1.5% Ni", source: "Kaggle/MinDat" },
      { name: "Morowali Laterite", distance: "78.5 km", grade: "1.2% Ni", source: "Kaggle/USGS" },
      { name: "Kolonodale Prospect", distance: "91.0 km", grade: "0.9% Ni", source: "Kaggle/MinDat" },
      { name: "Buli Laterite", distance: "120.7 km", grade: "2.0% Ni", source: "Kaggle/USGS" },
    ],
    ragContext: {
      shortText:
        "The North Sulawesi laterite nickel belt is part of the larger East Indonesian ophiolite complex, with well-developed limonite and saprolite horizons.",
      longText:
        "Hyperspectral ASTER data confirms Fe-oxide absorption features consistent with laterite profiles. Drill core correlations from the 2022 campaign validate the AI model at 91% accuracy for Ni grade estimation in the saprolite zone.",
      sourceRef: "sulawesi_nickel_assessment.pdf (p.14)",
    },
    aiSummary:
      'Excellent Ni-laterite potential with high model confidence (91%). The saprolite horizon between 8-22m depth shows consistent 1.4-2.2% Ni grades. Cobalt enrichment detected in the limonite cap at 0.08-0.15% Co.',
    baseGradeRange: "1.4 - 2.2% Ni",
    depthRange: "8-22m",
    cogDefault: 0.8,
    baseTonnage: 2100000,
    baseNetValue: 24000000,
  },
  {
    id: "pit-papua-highland",
    name: "Pit Papua Highland",
    location: "Central Papua, Indonesia",
    minerals: ["Au", "Cu", "Mo"],
    driftStatus: "stable",
    lastInference: "5 hours ago",
    estimatedTonnage: "3.45M t",
    confidence: 83,
    status: "active",
    center: "4.056\u00B0S, 137.112\u00B0E",
    area: "5.2 km\u00B2",
    elevation: "3200-3850m ASL",
    lastSyncedAt: "5 hours ago",
    mineralLayers: [
      { id: "Au", label: "Gold (Au)", color: "bg-amber-400" },
      { id: "Cu", label: "Copper (Cu)", color: "bg-orange-500" },
      { id: "Mo", label: "Molybdenum (Mo)", color: "bg-violet-500" },
    ],
    nearestDeposits: [
      { name: "Grasberg Complex", distance: "32.7 km", grade: "0.83 g/t Au, 0.36% Cu", source: "Kaggle/USGS" },
      { name: "Ertsberg Skarn", distance: "35.2 km", grade: "1.2% Cu", source: "Kaggle/USGS" },
      { name: "Wabu Gold Ridge", distance: "58.4 km", grade: "4.6 g/t Au", source: "Kaggle/MinDat" },
      { name: "Puncak Jaya Reference", distance: "70.1 km", grade: "0.5% Cu", source: "Kaggle/USGS" },
      { name: "Oksibil Prospect", distance: "95.0 km", grade: "1.8 g/t Au", source: "Kaggle/MinDat" },
    ],
    ragContext: {
      shortText:
        "The Central Papua highlands host world-class porphyry Cu-Au systems within the Papuan Fold Belt, associated with Pliocene intrusions into Mesozoic carbonates.",
      longText:
        "Magnetic and gravity surveys delineate a 2km-diameter anomaly consistent with a dioritic intrusion at depth. Surface mapping reveals phyllic and potassic alteration zones with Cu-sulfide stockwork veining. ASTER thermal data shows a 4.1K anomaly over the core zone.",
      sourceRef: "papua_exploration_2024.pdf (p.31)",
    },
    aiSummary:
      'Significant porphyry Cu-Au target with strong geophysical signature. Proximity to Grasberg complex (32.7 km) and similar geological setting support grade estimates of 0.3-0.8% Cu and 0.5-1.5 g/t Au. High-altitude challenges noted for operational planning.',
    baseGradeRange: "0.3-0.8% Cu, 0.5-1.5 g/t Au",
    depthRange: "25-60m",
    cogDefault: 2.0,
    baseTonnage: 3450000,
    baseNetValue: 42000000,
  },
  {
    id: "pit-ntt-east",
    name: "Pit NTT East",
    location: "East Nusa Tenggara, Indonesia",
    minerals: ["Mn", "Cu"],
    driftStatus: "drifting",
    lastInference: "1 day ago",
    estimatedTonnage: "560K t",
    confidence: 65,
    status: "inactive",
    center: "8.652\u00B0S, 121.643\u00B0E",
    area: "0.9 km\u00B2",
    elevation: "210-340m ASL",
    lastSyncedAt: "1 day ago",
    mineralLayers: [
      { id: "Mn", label: "Manganese (Mn)", color: "bg-purple-500" },
      { id: "Cu", label: "Copper (Cu)", color: "bg-orange-500" },
    ],
    nearestDeposits: [
      { name: "Timor Mn District", distance: "15.2 km", grade: "38% Mn", source: "Kaggle/USGS" },
      { name: "Soe Deposit", distance: "28.9 km", grade: "32% Mn", source: "Kaggle/MinDat" },
      { name: "Atambua Prospect", distance: "44.3 km", grade: "0.3% Cu", source: "Kaggle/USGS" },
      { name: "Kupang Laterite", distance: "67.8 km", grade: "25% Mn", source: "Kaggle/MinDat" },
      { name: "Rote Prospect", distance: "85.1 km", grade: "0.15% Cu", source: "Kaggle/USGS" },
    ],
    ragContext: {
      shortText:
        "NTT manganese deposits are associated with Permian-Triassic marine sedimentary sequences uplifted during the Banda Arc collision.",
      longText:
        "Limited recent exploration data available. Historical Dutch colonial reports (1930s) indicate surface Mn-oxide occurrences. Modern ASTER imagery suggests limited lateral extent. Model confidence is low due to sparse training data for this geological domain.",
      sourceRef: "ntt_mineral_review.pdf (p.8)",
    },
    aiSummary:
      'Lower confidence assessment for this AOI. Manganese potential is localized with limited depth extent. Sparse training data for the NTT geological domain contributes to model drift. Recommend additional ground-truthing before operational decisions.',
    baseGradeRange: "25-38% Mn",
    depthRange: "5-15m",
    cogDefault: 0.5,
    baseTonnage: 560000,
    baseNetValue: 3200000,
  },
  {
    id: "pit-maluku-central",
    name: "Pit Maluku Central",
    location: "Maluku, Indonesia",
    minerals: ["Ni", "Cr", "Fe"],
    driftStatus: "stable",
    lastInference: "12 hours ago",
    estimatedTonnage: "1.8M t",
    confidence: 88,
    status: "finished",
    center: "2.842\u00B0S, 128.175\u00B0E",
    area: "2.8 km\u00B2",
    elevation: "32-95m ASL",
    lastSyncedAt: "12 hours ago",
    mineralLayers: [
      { id: "Ni", label: "Nickel (Ni)", color: "bg-teal-500" },
      { id: "Cr", label: "Chromium (Cr)", color: "bg-emerald-600" },
      { id: "Fe", label: "Iron (Fe)", color: "bg-red-500" },
    ],
    nearestDeposits: [
      { name: "Halmahera Laterite", distance: "52.3 km", grade: "1.6% Ni", source: "Kaggle/USGS" },
      { name: "Weda Bay", distance: "68.7 km", grade: "1.4% Ni", source: "Kaggle/MinDat" },
      { name: "Obi Island", distance: "89.2 km", grade: "1.1% Ni", source: "Kaggle/USGS" },
      { name: "Buli Reference", distance: "105.6 km", grade: "2.0% Ni", source: "Kaggle/USGS" },
      { name: "Gebe Island Prospect", distance: "120.3 km", grade: "0.9% Ni", source: "Kaggle/MinDat" },
    ],
    ragContext: {
      shortText:
        "Central Maluku ophiolite-hosted Ni-Cr laterite deposits formed through tropical weathering of ultramafic basement rocks. Exploration completed Q3 2024.",
      longText:
        "Complete drill program (48 holes, 2,400m) validates AI model predictions with 88% accuracy. Final resource estimate submitted. The deposit shows a well-developed saprolite profile with consistent Ni grades in the 1.2-1.8% range.",
      sourceRef: "maluku_final_report_2024.pdf (p.62)",
    },
    aiSummary:
      'Exploration program completed. Final AI-validated resource estimate of 1.8M tonnes at 1.2-1.8% Ni with 88% model confidence. Chromium co-product at 0.8-1.2% Cr confirmed in the upper limonite zone. Project transitioned to feasibility study phase.',
    baseGradeRange: "1.2-1.8% Ni",
    depthRange: "6-20m",
    cogDefault: 0.7,
    baseTonnage: 1800000,
    baseNetValue: 21000000,
  },
  {
    id: "pit-sumatra-north",
    name: "Pit Sumatra North",
    location: "North Sumatra, Indonesia",
    minerals: ["Au", "Ag", "Zn"],
    driftStatus: "stable",
    lastInference: "30 min ago",
    estimatedTonnage: "1.56M t",
    confidence: 79,
    status: "active",
    center: "2.145\u00B0N, 99.023\u00B0E",
    area: "3.1 km\u00B2",
    elevation: "650-920m ASL",
    lastSyncedAt: "30 min ago",
    mineralLayers: [
      { id: "Au", label: "Gold (Au)", color: "bg-amber-400" },
      { id: "Ag", label: "Silver (Ag)", color: "bg-slate-400" },
      { id: "Zn", label: "Zinc (Zn)", color: "bg-zinc-400" },
    ],
    nearestDeposits: [
      { name: "Martabe Gold Mine", distance: "22.5 km", grade: "3.1 g/t Au", source: "Kaggle/USGS" },
      { name: "Sarulla Prospect", distance: "38.4 km", grade: "1.4 g/t Au", source: "Kaggle/MinDat" },
      { name: "Batu Jarum", distance: "51.2 km", grade: "2.5 g/t Au", source: "Kaggle/USGS" },
      { name: "Dolok Panribuan", distance: "65.8 km", grade: "0.8 g/t Au", source: "Kaggle/MinDat" },
      { name: "Sibolga Prospect", distance: "80.3 km", grade: "1.1 g/t Au", source: "Kaggle/USGS" },
    ],
    ragContext: {
      shortText:
        "The North Sumatra epithermal belt hosts several significant Au-Ag deposits associated with Quaternary volcanism along the Sumatra Fault System.",
      longText:
        "SWIR analysis reveals adularia-sericite assemblages typical of low-sulfidation epithermal systems. Structural mapping identifies a NW-trending dilational jog favorable for ore shoot development. Geochemical results show Au-Ag-Zn-Pb anomalism consistent with deeper boiling zones.",
      sourceRef: "sumatra_exploration_2025.pdf (p.19)",
    },
    aiSummary:
      'Promising low-sulfidation epithermal Au-Ag target in a well-known metallogenic belt. Proximity to Martabe (22.5 km) and favorable structural setting support grade estimates of 1.5-3.0 g/t Au with Ag credits. Zinc enrichment at depth may indicate transition to mesothermal system.',
    baseGradeRange: "1.5-3.0 g/t Au",
    depthRange: "20-45m",
    cogDefault: 1.2,
    baseTonnage: 1560000,
    baseNetValue: 16500000,
  },
  {
    id: "pit-bangka-tin",
    name: "Pit Bangka Tin",
    location: "Bangka Belitung, Indonesia",
    minerals: ["Sn", "Ta"],
    driftStatus: "stable",
    lastInference: "6 hours ago",
    estimatedTonnage: "420K t",
    confidence: 76,
    status: "finished",
    center: "2.098\u00B0S, 106.112\u00B0E",
    area: "1.2 km\u00B2",
    elevation: "15-45m ASL",
    lastSyncedAt: "6 hours ago",
    mineralLayers: [
      { id: "Sn", label: "Tin (Sn)", color: "bg-gray-400" },
      { id: "Ta", label: "Tantalum (Ta)", color: "bg-indigo-500" },
    ],
    nearestDeposits: [
      { name: "Pemali Tin Mine", distance: "5.8 km", grade: "0.8 kg/m3 Sn", source: "Kaggle/USGS" },
      { name: "Sungailiat Placer", distance: "12.3 km", grade: "0.5 kg/m3 Sn", source: "Kaggle/MinDat" },
      { name: "Kelapa Kampit", distance: "34.5 km", grade: "1.2 kg/m3 Sn", source: "Kaggle/USGS" },
      { name: "Belitung East", distance: "58.9 km", grade: "0.6 kg/m3 Sn", source: "Kaggle/MinDat" },
      { name: "Singkep Reference", distance: "95.4 km", grade: "0.4 kg/m3 Sn", source: "Kaggle/USGS" },
    ],
    ragContext: {
      shortText:
        "Bangka Island is part of the SE Asian Tin Belt, with primary tin mineralization in granitic stocks and extensive alluvial/eluvial placer deposits.",
      longText:
        "Radiometric data (K-Th-U) delineates granitic bodies hosting primary tin veins. Seismic sub-bottom profiling of offshore channels reveals paleo-river systems with concentrated tin-rich gravels. Final assessment completed.",
      sourceRef: "bangka_tin_final.pdf (p.55)",
    },
    aiSummary:
      'Tin exploration completed with validated resource model. Alluvial and primary tin zones mapped with 76% confidence. Tantalum co-product identified in columbite-tantalite accessory minerals. Project delivered to feasibility team.',
    baseGradeRange: "0.5-1.2 kg/m3 Sn",
    depthRange: "3-18m",
    cogDefault: 0.3,
    baseTonnage: 420000,
    baseNetValue: 5800000,
  },
  // ── Additional projects to demonstrate pagination ──
  {
    id: "pit-aceh-north",
    name: "Pit Aceh North",
    location: "Aceh, Sumatra",
    minerals: ["Au", "Ag"],
    driftStatus: "stable" as DriftStatus,
    lastInference: "1 day ago",
    estimatedTonnage: "1.1M",
    confidence: 0.80,
    status: "active" as ProjectStatus,
    center: "5.5500N, 95.3222E",
    area: "8.0 km²",
    elevation: "650m ASL",
    lastSyncedAt: "2026-01-30T09:00:00Z",
    mineralLayers: [
      { id: "Au", label: "Gold (Au)", color: "bg-yellow-500" },
      { id: "Ag", label: "Silver (Ag)", color: "bg-gray-300" },
    ],
    nearestDeposits: [
      { name: "Meulaboh Deposit", distance: "18 km NE", grade: "3.4 g/t Au", source: "Geomin 2024" },
    ],
    ragContext: {
      shortText: "Aceh North region shows orogenic gold potential within metamorphic basement terranes.",
      longText: "Structural analysis reveals NW-SE trending shear zones controlling gold mineralization. Artisanal mining reports suggest average grades of 2.5-4.0 g/t Au in quartz veins.",
      sourceRef: "aceh_gold_prospect.pdf (p.12)",
    },
    aiSummary: "Orogenic gold system with shear-hosted mineralization. Early-stage exploration shows promising structural controls and surface geochemistry.",
    baseGradeRange: "1.5-4.0 g/t Au",
    depthRange: "15-120m",
    cogDefault: 1.0,
    baseTonnage: 900000,
    baseNetValue: 12000000,
  },
  {
    id: "pit-maluku-central",
    name: "Pit Maluku Central",
    location: "Maluku, Indonesia",
    minerals: ["Cu", "Au"],
    driftStatus: "drifting" as DriftStatus,
    lastInference: "3 hours ago",
    estimatedTonnage: "3.8M",
    confidence: 0.71,
    status: "active" as ProjectStatus,
    center: "-3.2100S, 130.1900E",
    area: "12.4 km²",
    elevation: "220m ASL",
    lastSyncedAt: "2026-02-05T14:00:00Z",
    mineralLayers: [
      { id: "Cu", label: "Copper (Cu)", color: "bg-orange-500" },
      { id: "Au", label: "Gold (Au)", color: "bg-yellow-500" },
    ],
    nearestDeposits: [
      { name: "Wetar Cu-Au", distance: "45 km E", grade: "1.8% Cu", source: "USGS 2023" },
    ],
    ragContext: {
      shortText: "Maluku Central hosts volcanic-hosted massive sulfide (VHMS) Cu-Au mineralization in Neogene arc volcanics.",
      longText: "Magnetic and IP surveys delineate massive sulfide horizons at 50-200m depth. Surface gossans show Cu-enrichment above 1.2% threshold.",
      sourceRef: "maluku_vhms.pdf (p.33)",
    },
    aiSummary: "VHMS copper-gold system with sulfide lenses at moderate depth. IP anomalies correlate well with known mineralization and warrant drill testing.",
    baseGradeRange: "0.8-2.5% Cu, 0.5-1.2 g/t Au",
    depthRange: "50-200m",
    cogDefault: 0.5,
    baseTonnage: 2800000,
    baseNetValue: 28000000,
  },
  {
    id: "pit-flores-east",
    name: "Pit Flores East",
    location: "NTT, Indonesia",
    minerals: ["Mn", "Au"],
    driftStatus: "stable" as DriftStatus,
    lastInference: "12 hours ago",
    estimatedTonnage: "0.9M",
    confidence: 0.65,
    status: "active" as ProjectStatus,
    center: "-8.6500S, 122.2300E",
    area: "5.5 km²",
    elevation: "380m ASL",
    lastSyncedAt: "2026-02-04T20:00:00Z",
    mineralLayers: [
      { id: "Mn", label: "Manganese (Mn)", color: "bg-gray-600" },
      { id: "Au", label: "Gold (Au)", color: "bg-yellow-500" },
    ],
    nearestDeposits: [
      { name: "Ende Mn Mine", distance: "30 km W", grade: "42% Mn", source: "Local Survey 2024" },
    ],
    ragContext: {
      shortText: "Flores East contains supergene manganese deposits capping epithermal gold veins.",
      longText: "Mn-oxide cap covers low-sulfidation epithermal Au veins at depth. Trenching shows 1.2-3.0 g/t Au below the manganese horizon.",
      sourceRef: "flores_mn_au.pdf (p.8)",
    },
    aiSummary: "Dual commodity opportunity: near-surface manganese with underlying epithermal gold. Requires deeper drilling to confirm Au resource beneath Mn cap.",
    baseGradeRange: "35-48% Mn, 0.8-3.0 g/t Au",
    depthRange: "5-80m",
    cogDefault: 0.8,
    baseTonnage: 600000,
    baseNetValue: 7500000,
  },
  {
    id: "pit-kalteng-south",
    name: "Pit Kalteng South",
    location: "Central Kalimantan",
    minerals: ["Fe", "Au"],
    driftStatus: "stable" as DriftStatus,
    lastInference: "2 days ago",
    estimatedTonnage: "5.2M",
    confidence: 0.73,
    status: "active" as ProjectStatus,
    center: "-2.2500S, 114.1500E",
    area: "18.0 km²",
    elevation: "45m ASL",
    lastSyncedAt: "2026-02-03T10:00:00Z",
    mineralLayers: [
      { id: "Fe", label: "Iron (Fe)", color: "bg-red-700" },
      { id: "Au", label: "Gold (Au)", color: "bg-yellow-500" },
    ],
    nearestDeposits: [
      { name: "Muara Teweh Fe", distance: "22 km N", grade: "58% Fe", source: "GeoIndo 2025" },
    ],
    ragContext: {
      shortText: "Central Kalimantan lateritic iron deposits with secondary gold enrichment in paleo-channel systems.",
      longText: "Gravity and magnetic surveys delineate deep laterite profiles (15-30m) with iron content >55%. Alluvial gold sampling in adjacent drainages returns 0.3-1.5 g/t Au.",
      sourceRef: "kalteng_laterite.pdf (p.22)",
    },
    aiSummary: "Large-tonnage iron laterite with alluvial gold potential. Bulk tonnage model suits open-pit extraction. Gold by-product adds economic value.",
    baseGradeRange: "52-62% Fe, 0.2-1.5 g/t Au",
    depthRange: "5-35m",
    cogDefault: 45.0,
    baseTonnage: 4500000,
    baseNetValue: 18000000,
  },
  {
    id: "pit-gorontalo-west",
    name: "Pit Gorontalo West",
    location: "Gorontalo, Sulawesi",
    minerals: ["Au", "Cu", "Mo"],
    driftStatus: "drifting" as DriftStatus,
    lastInference: "6 hours ago",
    estimatedTonnage: "2.1M",
    confidence: 0.77,
    status: "active" as ProjectStatus,
    center: "0.6500N, 122.4500E",
    area: "9.8 km²",
    elevation: "500m ASL",
    lastSyncedAt: "2026-02-05T08:00:00Z",
    mineralLayers: [
      { id: "Au", label: "Gold (Au)", color: "bg-yellow-500" },
      { id: "Cu", label: "Copper (Cu)", color: "bg-orange-500" },
      { id: "Mo", label: "Molybdenum (Mo)", color: "bg-violet-400" },
    ],
    nearestDeposits: [
      { name: "Suwawa Porphyry", distance: "12 km SE", grade: "0.6% Cu, 0.4 g/t Au", source: "J-Resources 2024" },
    ],
    ragContext: {
      shortText: "Gorontalo West shows classic porphyry Cu-Au-Mo indicators including phyllic alteration and quartz stockwork.",
      longText: "IP chargeability highs correlate with potassic alteration core at depth. Surface Cu-in-soil anomaly exceeds 500 ppm over 2 km strike length. Mo enrichment at 100-150 ppm indicates porphyry root zone.",
      sourceRef: "gorontalo_porphyry.pdf (p.41)",
    },
    aiSummary: "High-potential porphyry Cu-Au-Mo target with strong geophysical and geochemical signatures. Drill program recommended for confirmation of hypogene mineralization.",
    baseGradeRange: "0.3-0.9% Cu, 0.2-0.8 g/t Au",
    depthRange: "80-400m",
    cogDefault: 0.25,
    baseTonnage: 1800000,
    baseNetValue: 22000000,
  },
  {
    id: "pit-halmahera-south",
    name: "Pit Halmahera South",
    location: "North Maluku",
    minerals: ["Ni", "Co"],
    driftStatus: "stable" as DriftStatus,
    lastInference: "1 day ago",
    estimatedTonnage: "6.5M",
    confidence: 0.82,
    status: "finished" as ProjectStatus,
    center: "0.0500N, 127.8900E",
    area: "22.0 km²",
    elevation: "120m ASL",
    lastSyncedAt: "2026-01-15T12:00:00Z",
    mineralLayers: [
      { id: "Ni", label: "Nickel (Ni)", color: "bg-emerald-600" },
      { id: "Co", label: "Cobalt (Co)", color: "bg-blue-500" },
    ],
    nearestDeposits: [
      { name: "Weda Bay Ni", distance: "35 km SW", grade: "1.6% Ni", source: "Eramet 2024" },
    ],
    ragContext: {
      shortText: "Halmahera South lateritic nickel with cobalt enrichment in limonite zone, part of the Halmahera ophiolite belt.",
      longText: "Laterite profile 20-40m thick over ultramafic basement. Limonite zone averages 1.2% Ni and 0.1% Co. Saprolite zone grades up to 1.8% Ni. Full resource estimate completed.",
      sourceRef: "halmahera_ni.pdf (p.60)",
    },
    aiSummary: "Completed lateritic Ni-Co resource model with high confidence. HPAL processing route recommended for limonite; DSO for saprolite. Project ready for feasibility.",
    baseGradeRange: "1.0-2.0% Ni, 0.05-0.15% Co",
    depthRange: "5-40m",
    cogDefault: 0.8,
    baseTonnage: 5500000,
    baseNetValue: 42000000,
  },
  {
    id: "pit-mimika-highland",
    name: "Pit Mimika Highland",
    location: "Papua, Indonesia",
    minerals: ["Cu", "Au", "Ag"],
    driftStatus: "stable" as DriftStatus,
    lastInference: "5 days ago",
    estimatedTonnage: "8.0M",
    confidence: 0.88,
    status: "finished" as ProjectStatus,
    center: "-4.0600S, 137.1100E",
    area: "15.0 km²",
    elevation: "3200m ASL",
    lastSyncedAt: "2025-12-20T10:00:00Z",
    mineralLayers: [
      { id: "Cu", label: "Copper (Cu)", color: "bg-orange-500" },
      { id: "Au", label: "Gold (Au)", color: "bg-yellow-500" },
      { id: "Ag", label: "Silver (Ag)", color: "bg-gray-300" },
    ],
    nearestDeposits: [
      { name: "Grasberg Complex", distance: "8 km NW", grade: "1.0% Cu, 1.0 g/t Au", source: "Freeport 2024" },
    ],
    ragContext: {
      shortText: "Highland Papua porphyry-skarn Cu-Au system adjacent to the world-class Grasberg district.",
      longText: "Skarn and porphyry mineralization confirmed by diamond drilling. Average intercepts of 0.8% Cu and 0.6 g/t Au over 200m widths. Full block model validated against production data.",
      sourceRef: "mimika_porphyry.pdf (p.88)",
    },
    aiSummary: "World-class porphyry-skarn system with validated resource model. High-confidence block model shows excellent reconciliation with actual production data. Fully handed off to mine planning.",
    baseGradeRange: "0.5-1.5% Cu, 0.3-1.2 g/t Au",
    depthRange: "100-600m",
    cogDefault: 0.3,
    baseTonnage: 7000000,
    baseNetValue: 85000000,
  },
];

// ─── Data Access Functions (simulate backend API) ─────────────

export function getAllProjects(): ProjectSummary[] {
  return allProjects.map(({ id, name, location, minerals, driftStatus, lastInference, estimatedTonnage, confidence, status }) => ({
    id, name, location, minerals, driftStatus, lastInference, estimatedTonnage, confidence, status,
  }));
}

export function getProjectsByStatus(status: ProjectStatus): ProjectSummary[] {
  return getAllProjects().filter((p) => p.status === status);
}

export function getActiveProjects(): ProjectSummary[] {
  return getProjectsByStatus("active");
}

export function getProjectDetail(id: string): ProjectDetail | undefined {
  return allProjects.find((p) => p.id === id);
}

export function getProjectStats(projects: ProjectSummary[]) {
  const totalTonnage = projects.reduce((sum, p) => {
    const num = parseFloat(p.estimatedTonnage.replace(/[^0-9.]/g, ""));
    const mult = p.estimatedTonnage.includes("M") ? 1_000_000 : p.estimatedTonnage.includes("K") ? 1_000 : 1;
    return sum + num * mult;
  }, 0);

  const avgConfidence =
    projects.length > 0
      ? projects.reduce((sum, p) => sum + p.confidence, 0) / projects.length
      : 0;

  const activeInferences = projects.filter((p) => {
    const t = p.lastInference.toLowerCase();
    return t.includes("min") || (t.includes("hour") && !t.includes("hours"));
  }).length;

  return {
    totalProjects: projects.length,
    totalTonnage: totalTonnage >= 1_000_000 ? `${(totalTonnage / 1_000_000).toFixed(2)}M` : `${(totalTonnage / 1_000).toFixed(0)}K`,
    avgConfidence: avgConfidence.toFixed(1),
    activeInferences,
  };
}

// ─── Activity Feed Data (per-project aware) ───────────────────
export interface ActivityItem {
  id: string;
  type: "inference" | "production" | "reconciliation";
  message: string;
  projectId: string;
  projectName: string;
  timestamp: string;
}

export function getRecentActivity(): ActivityItem[] {
  return [
    {
      id: "1",
      type: "inference",
      message: "AI completed voxel generation for AOI sector B7",
      projectId: "pit-berau-x",
      projectName: "Pit Berau X",
      timestamp: "2 min ago",
    },
    {
      id: "2",
      type: "production",
      message: "Actual grade data uploaded for Block #A3-12",
      projectId: "pit-kalimantan-s2",
      projectName: "Pit Kalimantan S2",
      timestamp: "15 min ago",
    },
    {
      id: "3",
      type: "reconciliation",
      message: "Drift detected: Over-estimation bias +5.2% in thermal zones",
      projectId: "pit-berau-x",
      projectName: "Pit Berau X",
      timestamp: "1 hour ago",
    },
    {
      id: "4",
      type: "inference",
      message: "RAG knowledge base updated with 3 new geological reports",
      projectId: "global",
      projectName: "Global",
      timestamp: "3 hours ago",
    },
    {
      id: "5",
      type: "production",
      message: "Daily production log submitted for 28 blocks",
      projectId: "pit-sulawesi-nw",
      projectName: "Pit Sulawesi NW",
      timestamp: "5 hours ago",
    },
    {
      id: "6",
      type: "inference",
      message: "New satellite imagery processed for Sumatra region",
      projectId: "pit-sumatra-north",
      projectName: "Pit Sumatra North",
      timestamp: "6 hours ago",
    },
    {
      id: "7",
      type: "reconciliation",
      message: "Lessons Learned injected: SWIR correlation correction factor",
      projectId: "pit-berau-x",
      projectName: "Pit Berau X",
      timestamp: "1 day ago",
    },
  ];
}

// ─── Reconciliation Summaries (per-project) ──────────────────

const reconciliationData: ReconciliationSummary[] = allProjects.map((p, idx) => {
  // Generate deterministic reconciliation stats from project data
  const seed = idx * 7 + 3;
  const biasOptions: ReconciliationSummary["modelBias"][] = ["over-estimation", "under-estimation", "balanced"];
  return {
    projectId: p.id,
    projectName: p.name,
    location: p.location,
    minerals: p.minerals,
    status: p.status,
    avgVariance: parseFloat((((seed * 13) % 100 - 50) / 100).toFixed(2)),
    blocksAnalyzed: 50 + ((seed * 17) % 200),
    blocksDrifting: ((seed * 11) % 15),
    blocksStable: 50 + ((seed * 17) % 200) - ((seed * 11) % 15),
    modelBias: biasOptions[seed % 3],
    lessonsInjected: 1 + ((seed * 7) % 12),
    lastReconciliation: p.lastInference,
    driftStatus: p.driftStatus,
  };
});

export function getAllReconciliations(): ReconciliationSummary[] {
  return reconciliationData;
}

export function getReconciliationByProject(projectId: string): ReconciliationSummary | undefined {
  return reconciliationData.find((r) => r.projectId === projectId);
}
