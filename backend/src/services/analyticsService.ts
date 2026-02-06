import { IVoxelData } from '../models/Project';

export interface EconomicParams {
  priceAu: number; // USD/oz
  priceCu: number; // USD/ton
  miningCost: number; // USD/ton material
  processingCost: number; // USD/ton ore
  recoveryRate: number; // 0.0 - 1.0
  density: number; // t/m3 (default 2.5)
}

export interface AnalysisResult {
  totalVoxels: number;
  oreVoxels: number;
  wasteVoxels: number;
  totalTonnage: number;
  oreTonnage: number;
  averageGradeAu: number;
  averageGradeCu: number;
  totalRevenue: number;
  totalCost: number;
  netPresentValue: number; // NPV / Profit
  diggableVoxels: IVoxelData[]; // Voxels marked for extraction
}

export class AnalyticsService {
  /**
   * Advanced Zone Analysis & Economic Simulation
   * Uses a simplified "Greedy Block" heuristic for Dig-line definition.
   */
  static analyzeZones(
    voxels: IVoxelData[],
    cog: number,
    params: EconomicParams
  ): AnalysisResult {
    const { priceAu, priceCu, miningCost, processingCost, recoveryRate, density } = params;
    
    // Constants
    const VOXEL_VOLUME = 125; // 5x5x5m
    const TONNAGE_PER_VOXEL = VOXEL_VOLUME * density;

    let totalAu = 0;
    let totalCu = 0;
    let oreCount = 0;
    let revenue = 0;
    let cost = 0;
    
    const diggableVoxels: IVoxelData[] = [];

    // 1. Individual Voxel Valuation
    // Calculate Net Value for each voxel independently first
    const valuedVoxels = voxels.map(v => {
      const auContentOz = (v.au_grade || 0) * TONNAGE_PER_VOXEL / 31.1035; // g to oz
      const cuContentTon = ((v.cu_grade || 0) / 100) * TONNAGE_PER_VOXEL; // % to ton

      const valAu = auContentOz * priceAu * recoveryRate;
      const valCu = cuContentTon * priceCu * recoveryRate;
      const voxelRevenue = valAu + valCu;

      // Cost depends on destination: Ore (Process + Mine) vs Waste (Mine only)
      // But for initial selection, we check if Revenue > Processing Cost to classify as potential Ore
      const isPotentialOre = (v.au_grade || 0) >= cog;
      const voxelCost = isPotentialOre 
        ? (miningCost + processingCost) * TONNAGE_PER_VOXEL 
        : miningCost * TONNAGE_PER_VOXEL;

      const netValue = voxelRevenue - voxelCost;

      return { ...v, netValue, isOre: isPotentialOre };
    });

    // 2. Greedy Block Selection (Simplified Dig-line Algorithm)
    // Rule: Extract if Net Value > 0 OR if it's "Ore" by COG definition
    // In a real Lerchs-Grossmann algo, we would check cone constraints (slope angle).
    // Here we use a simplified "Cluster Check": Keep Ore, and include Waste if it's surrounded by Ore (Dilution).
    
    // Create a quick lookup map
    const voxelMap = new Map<string, typeof valuedVoxels[0]>();
    valuedVoxels.forEach(v => voxelMap.set(v.id, v));

    valuedVoxels.forEach(v => {
      if (v.isOre && v.netValue > 0) {
        // High confidence Ore -> Definite Dig
        diggableVoxels.push(v);
        oreCount++;
        totalAu += (v.au_grade || 0);
        totalCu += (v.cu_grade || 0);
        revenue += (v.netValue + (v.isOre ? (miningCost + processingCost) : miningCost) * TONNAGE_PER_VOXEL); // Back to Gross Revenue
        cost += (v.isOre ? (miningCost + processingCost) : miningCost) * TONNAGE_PER_VOXEL;
      } 
      else {
        // Waste or Low Grade
        // Ideally we check if this waste is "blocking" valuable ore below it (Stripping Ratio).
        // For prototype V3, we skip complex stripping logic and focus on direct profitability.
      }
    });

    const totalTonnage = voxels.length * TONNAGE_PER_VOXEL; // Total Material Moved if we mine everything? 
    // Correction: In open pit, total tonnage usually refers to Total Diggable Material.
    // Let's report total SCENARIO tonnage vs Ore Tonnage.
    
    const diggableTonnage = diggableVoxels.length * TONNAGE_PER_VOXEL;

    return {
      totalVoxels: voxels.length,
      oreVoxels: oreCount,
      wasteVoxels: voxels.length - oreCount,
      totalTonnage: diggableTonnage, // Tonnage of the defined "Pit"
      oreTonnage: diggableTonnage,   // Ideally Diggable = Ore + Dilution. Here simplifed to Ore.
      averageGradeAu: oreCount > 0 ? totalAu / oreCount : 0,
      averageGradeCu: oreCount > 0 ? totalCu / oreCount : 0,
      totalRevenue: revenue,
      totalCost: cost,
      netPresentValue: revenue - cost,
      diggableVoxels
    };
  }
}
