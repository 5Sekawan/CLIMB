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

      {/* Separator */}
      <div className="h-10 w-px bg-border" />


      {/* Separator */}
      <div className="h-10 w-px bg-border" />


      {/* Separator */}
      <div className="h-10 w-px bg-border" />



      {/* Spacer */}
      <div className="flex-1" />
    </div>
  );
}
