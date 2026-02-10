"use client";

import { cn } from "@/lib/utils";
import { CSlider, CButton } from "@/components/climb/ui";
import {
  PickaxeIcon,
  ChartUpIcon,
  DollarIcon,
} from "@/components/climb/icons";
import { useState, useCallback } from "react";

interface OperationalCockpitProps {
  cogDefault: number;
  baseTonnage: number;
  baseNetValue: number;
  className?: string;
}

export function OperationalCockpit({
  cogDefault,
  baseTonnage,
  baseNetValue,
  className,
}: OperationalCockpitProps) {
  const [cog, setCog] = useState(cogDefault);

  // Reactive computation based on COG and project-specific base values
  const factor = 1 - (cog - 0.5) / 5;
  const tonnage = Math.round(baseTonnage * Math.max(0, factor));
  const profit = Math.round(
    baseNetValue * Math.max(0, factor) * (1 - cog * 0.05),
  );
  const dilution = Number((2 + cog * 2).toFixed(1));

  const handleCogChange = useCallback((newCog: number) => {
    setCog(newCog);
  }, []);

  const formatNumber = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(2)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
    return n.toString();
  };

  return (
    <div
      className={cn(
        "flex items-center gap-6 border-t border-border bg-card/95 px-6 py-3 backdrop-blur-sm",
        className,
      )}
    >
      {/* COG Simulator */}
      <div className="flex-1 max-w-xs">
        <CSlider
          label="Cut-off Grade (COG)"
          min={0.5}
          max={5.0}
          step={0.1}
          value={cog}
          onChange={handleCogChange}
          unit=" g/t"
        />
      </div>

      {/* Separator */}
      <div className="h-10 w-px bg-border" />

      {/* Tonnage */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-climb-mint-subtle text-climb-mint">
          <PickaxeIcon className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Ore Tonnage
          </span>
          <span className="font-mono text-sm font-bold text-foreground">
            {formatNumber(tonnage)} t
          </span>
        </div>
      </div>

      {/* Separator */}
      <div className="h-10 w-px bg-border" />

      {/* Estimated Net Value */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-lime-50 text-climb-lime dark:bg-lime-950/30">
          <DollarIcon className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Est. Net Value
          </span>
          <span className="font-mono text-sm font-bold text-foreground">
            ${formatNumber(profit)}
          </span>
        </div>
      </div>

      {/* Separator */}
      <div className="h-10 w-px bg-border" />

      {/* Dilution */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-climb-marginal dark:bg-amber-950/30">
          <ChartUpIcon className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Dilution
          </span>
          <span className="font-mono text-sm font-bold text-foreground">
            {dilution}%
          </span>
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />
    </div>
  );
}
