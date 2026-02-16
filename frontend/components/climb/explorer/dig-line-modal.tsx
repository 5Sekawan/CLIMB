"use client";

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { CButton, CInput, CSlider } from "@/components/climb/ui";
import { DollarIcon, PickaxeIcon } from "@/components/climb/icons";
import { MineralLayer } from "@/lib/mock-data";
import { useGenerateMarginalZones } from "@/hooks/use-projects";

// ─── Mineral preset units ────────────────────────────────────
const MINERAL_UNIT_MAP: Record<string, { unit: string; label: string; defaultPrice: number }> = {
    Au: { unit: 'oz', label: 'USD/oz', defaultPrice: 2000 },
    Ag: { unit: 'oz', label: 'USD/oz', defaultPrice: 25 },
    Pt: { unit: 'oz', label: 'USD/oz', defaultPrice: 1000 },
    Cu: { unit: 'ton', label: 'USD/ton', defaultPrice: 8500 },
    Ni: { unit: 'ton', label: 'USD/ton', defaultPrice: 18000 },
    Zn: { unit: 'ton', label: 'USD/ton', defaultPrice: 2500 },
    Fe: { unit: 'ton', label: 'USD/ton', defaultPrice: 120 },
    Mn: { unit: 'ton', label: 'USD/ton', defaultPrice: 300 },
    Cr: { unit: 'ton', label: 'USD/ton', defaultPrice: 250 },
    Co: { unit: 'ton', label: 'USD/ton', defaultPrice: 30000 },
    Sn: { unit: 'ton', label: 'USD/ton', defaultPrice: 25000 },
    Li: { unit: 'ton', label: 'USD/ton', defaultPrice: 20000 },
};

function getDefaultUnit(mineral: string) {
    return MINERAL_UNIT_MAP[mineral] || { unit: 'ton', label: 'USD/ton', defaultPrice: 100 };
}

interface DigLineModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    minerals: MineralLayer[];
    onSuccess: (data: any) => void;
}

export function DigLineModal({ isOpen, onClose, projectId, minerals, onSuccess }: DigLineModalProps) {
    // Selection mode: cumulative or individual
    const [mode, setMode] = useState<'cumulative' | 'individual'>('cumulative');
    const [selectedMinerals, setSelectedMinerals] = useState<string[]>(minerals.map(m => m.id));

    // Prices per mineral
    const [prices, setPrices] = useState<Record<string, number>>(() => {
        const defaults: Record<string, number> = {};
        minerals.forEach(m => {
            defaults[m.id] = getDefaultUnit(m.id).defaultPrice;
        });
        return defaults;
    });

    // Economic params
    const [miningCost, setMiningCost] = useState(3);
    const [processingCost, setProcessingCost] = useState(15);
    const [recoveryFactor, setRecoveryFactor] = useState(0.85);
    const [density, setDensity] = useState(2.5);

    const generateMutation = useGenerateMarginalZones();

    const activeMinerals = mode === 'cumulative' ? minerals.map(m => m.id) : selectedMinerals;

    const handleMineralToggle = useCallback((mineralId: string) => {
        setSelectedMinerals(prev =>
            prev.includes(mineralId) ? prev.filter(m => m !== mineralId) : [...prev, mineralId]
        );
    }, []);

    const handleGenerate = useCallback(async () => {
        const mineralPrices: Record<string, number> = {};
        const mineralUnits: Record<string, string> = {};
        activeMinerals.forEach(m => {
            mineralPrices[m] = prices[m] || 0;
            mineralUnits[m] = getDefaultUnit(m).unit;
        });

        try {
            const result = await generateMutation.mutateAsync({
                id: projectId,
                params: {
                    selectedMinerals: activeMinerals,
                    mineralPrices,
                    mineralUnits,
                    miningCost,
                    processingCost,
                    recoveryFactor,
                    density,
                },
            });
            onSuccess(result.data);
            onClose();
        } catch (err) {
            console.error('Failed to generate marginal zones:', err);
        }
    }, [activeMinerals, prices, miningCost, processingCost, recoveryFactor, density, projectId, generateMutation, onSuccess, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-2xl shadow-black/30">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-6 py-4 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 ring-1 ring-amber-500/30">
                            <PickaxeIcon className="h-4.5 w-4.5 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-foreground">Generate Dig Lines</h2>
                            <p className="text-xs text-muted-foreground">Configure economic parameters for zone optimization</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-lg">×</button>
                </div>

                <div className="space-y-5 p-6">
                    {/* Mineral Selection Mode */}
                    <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Mineral Mode</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setMode('cumulative')}
                                className={cn(
                                    "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200",
                                    mode === 'cumulative'
                                        ? "border-climb-mint/50 bg-climb-mint/10 text-climb-mint shadow-sm shadow-climb-mint/10"
                                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                )}
                            >
                                Cumulative (All)
                            </button>
                            <button
                                onClick={() => setMode('individual')}
                                className={cn(
                                    "flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-200",
                                    mode === 'individual'
                                        ? "border-climb-mint/50 bg-climb-mint/10 text-climb-mint shadow-sm shadow-climb-mint/10"
                                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/50"
                                )}
                            >
                                Select Individual
                            </button>
                        </div>
                    </div>

                    {/* Individual mineral checkboxes */}
                    {mode === 'individual' && (
                        <div>
                            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Select Minerals</label>
                            <div className="grid grid-cols-2 gap-2">
                                {minerals.map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => handleMineralToggle(m.id)}
                                        className={cn(
                                            "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all duration-200",
                                            selectedMinerals.includes(m.id)
                                                ? "border-climb-mint/50 bg-climb-mint/10 text-foreground"
                                                : "border-border bg-muted/20 text-muted-foreground hover:bg-muted/40"
                                        )}
                                    >
                                        <div className={cn("h-3 w-3 rounded-full border-2 transition-all",
                                            selectedMinerals.includes(m.id)
                                                ? "border-climb-mint bg-climb-mint"
                                                : "border-muted-foreground"
                                        )} />
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Prices per mineral */}
                    <div>
                        <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            <DollarIcon className="inline-block h-3.5 w-3.5 mr-1 -mt-0.5" />
                            Mineral Prices
                        </label>
                        <div className="space-y-2">
                            {activeMinerals.map(m => {
                                const preset = getDefaultUnit(m);
                                const mineralLayer = minerals.find(l => l.id === m);
                                return (
                                    <div key={m} className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
                                        <span className="w-16 text-sm font-medium text-foreground">{mineralLayer?.label || m}</span>
                                        <input
                                            type="number"
                                            value={prices[m] || 0}
                                            onChange={(e) => setPrices(prev => ({ ...prev, [m]: Number(e.target.value) }))}
                                            className="flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-climb-mint/50 focus:ring-1 focus:ring-climb-mint/30 transition-all"
                                            min={0}
                                            step={1}
                                        />
                                        <span className="text-xs text-muted-foreground w-16">{preset.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Economic Parameters */}
                    <div className="space-y-3">
                        <label className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">Cost Parameters</label>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-lg border border-border bg-muted/20 p-3">
                                <label className="mb-1 block text-xs text-muted-foreground">Mining Cost</label>
                                <div className="flex items-center gap-1">
                                    <input type="number" value={miningCost} onChange={e => setMiningCost(Number(e.target.value))}
                                        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-climb-mint/50 transition-all" min={0} step={0.1} />
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">$/ton</span>
                                </div>
                            </div>

                            <div className="rounded-lg border border-border bg-muted/20 p-3">
                                <label className="mb-1 block text-xs text-muted-foreground">Processing Cost</label>
                                <div className="flex items-center gap-1">
                                    <input type="number" value={processingCost} onChange={e => setProcessingCost(Number(e.target.value))}
                                        className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-climb-mint/50 transition-all" min={0} step={0.1} />
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">$/ton</span>
                                </div>
                            </div>
                        </div>

                        <CSlider
                            label="Recovery Factor"
                            min={0}
                            max={1}
                            step={0.01}
                            value={recoveryFactor}
                            onChange={setRecoveryFactor}
                            unit=""
                        />

                        <div className="rounded-lg border border-border bg-muted/20 p-3">
                            <label className="mb-1 block text-xs text-muted-foreground">Rock Density</label>
                            <div className="flex items-center gap-1">
                                <input type="number" value={density} onChange={e => setDensity(Number(e.target.value))}
                                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-climb-mint/50 transition-all" min={0.1} step={0.1} />
                                <span className="text-xs text-muted-foreground whitespace-nowrap">t/m³</span>
                            </div>
                        </div>
                    </div>

                    {/* Error */}
                    {generateMutation.isError && (
                        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">
                            Failed to generate zones. Please check your parameters and try again.
                        </div>
                    )}

                    {/* Generate Button */}
                    <CButton
                        variant="solid"
                        size="lg"
                        onClick={handleGenerate}
                        className="w-full"
                        disabled={generateMutation.isPending || activeMinerals.length === 0}
                    >
                        {generateMutation.isPending ? (
                            <div className="flex items-center gap-2">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                Analyzing Blocks...
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <PickaxeIcon className="h-4 w-4" />
                                Generate Marginal Zones
                            </div>
                        )}
                    </CButton>
                </div>
            </div>
        </div>
    );
}
