export interface AnalysisResult {
  totalVoxels: number;
  oreVoxels: number;
  wasteVoxels: number;
  marginalVoxels: number;
  estimatedTonnage: number;
  averageGradeAu: number;
  averageGradeCu: number;
  expectedProfit: number;
}

export class AnalyticsService {
  /**
   * Classifies voxels and calculates economic metrics
   */
  static analyzeZones(
    voxels: any[],
    cog: number, // Cut-off Grade
    prices: { au: number; cu: number },
    costs: { miningPerTon: number }
  ): AnalysisResult {
    let oreCount = 0;
    let wasteCount = 0;
    let marginalCount = 0;
    let totalAu = 0;
    let totalCu = 0;

    const MARGINAL_THRESHOLD = 0.1; // 10% around COG

    voxels.forEach(v => {
      const grade = v.au_grade; // Assuming Au is the primary mineral for COG
      totalAu += v.au_grade;
      totalCu += v.cu_grade;

      if (grade >= cog) {
        oreCount++;
      } else if (grade >= cog * (1 - MARGINAL_THRESHOLD)) {
        marginalCount++;
      } else {
        wasteCount++;
      }
    });

    // Simple tonnage calculation (Voxel 5x5x5m = 125m3, Density ~2.5 t/m3)
    const density = 2.5;
    const tonnagePerVoxel = 125 * density;
    const totalTonnage = voxels.length * tonnagePerVoxel;

    // Expected Profit = (Revenue from Ore) - (Mining Cost)
    // Revenue = Total Ore Mass * Average Grade * Recovery * Price
    const recovery = 0.85; // 85% recovery rate
    const oreTonnage = oreCount * tonnagePerVoxel;
    const avgOreGradeAu = (totalAu / voxels.length); // Simplified
    
    const revenue = (oreTonnage * (avgOreGradeAu / 1000) * recovery * prices.au);
    const totalCost = totalTonnage * costs.miningPerTon;

    return {
      totalVoxels: voxels.length,
      oreVoxels: oreCount,
      wasteVoxels: wasteCount,
      marginalVoxels: marginalCount,
      estimatedTonnage: totalTonnage,
      averageGradeAu: totalAu / voxels.length,
      averageGradeCu: totalCu / voxels.length,
      expectedProfit: revenue - totalCost
    };
  }
}
