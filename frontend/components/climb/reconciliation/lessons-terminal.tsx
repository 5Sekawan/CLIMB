"use client";

import { cn } from "@/lib/utils";
import { BrainIcon } from "@/components/climb/icons";
import { CButton } from "@/components/climb/ui";
import { DatabaseIcon } from "@/components/climb/icons";
import { useInjectFeedback } from "@/hooks/use-reconciliation";
import { useState } from "react";

interface LessonsTerminalProps {
  className?: string;
  projectId?: string;
  location?: { lat: number; lon: number };
}

const lessons = [
  {
    id: 1,
    type: "system" as const,
    content:
      "Drift analysis complete. Processing 142 block comparisons from Pit Berau X.",
    timestamp: "14:23:01",
  },
  {
    id: 2,
    type: "ai" as const,
    content:
      "Pattern detected: Model systematically over-estimates Au grade by +5.2% in blocks where Thermal Anomaly > 2.1K above ambient. This is likely due to iron oxide interference in SWIR band ratios causing false alteration signatures.",
    timestamp: "14:23:04",
  },
  {
    id: 3,
    type: "ai" as const,
    content:
      "Recommendation: Apply correction factor of 0.948x to Au predictions in zones with Thermal Anomaly > 2.0K. Cross-validate with NDVI to filter vegetation-induced thermal bias.",
    timestamp: "14:23:05",
  },
  {
    id: 4,
    type: "system" as const,
    content:
      "Bias narrative generated. Ready for knowledge base injection.",
    timestamp: "14:23:06",
  },
  {
    id: 5,
    type: "ai" as const,
    content:
      'Lesson Learned: "In East Kalimantan epithermal systems, SWIR-based alteration mapping tends to over-predict Au grade by 3-7% where surface thermal anomalies exceed +2K, primarily due to secondary iron oxide accumulation in lateritic weathering zones."',
    timestamp: "14:23:08",
  },
];

export function LessonsTerminal({ className, projectId, location }: LessonsTerminalProps) {
  const injectFeedback = useInjectFeedback();
  const [injecting, setInjecting] = useState(false);

  const handleInject = async () => {
    if (!projectId || !location) return;
    
    // For MVP, we just inject the last AI lesson from the mock list
    const lessonText = lessons[lessons.length - 1].content;
    
    setInjecting(true);
    try {
      await injectFeedback.mutateAsync({
        projectId,
        lesson: lessonText,
        location
      });
      alert("Feedback injected successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to inject feedback.");
    } finally {
      setInjecting(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-border bg-card shadow-climb-1",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <BrainIcon className="h-4 w-4 text-climb-mint" />
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Lessons Learned Terminal
          </h3>
        </div>
        <CButton 
          variant="solid" 
          size="sm" 
          onClick={handleInject} 
          disabled={injecting || !projectId}
        >
          <DatabaseIcon className="h-3 w-3" />
          {injecting ? "Injecting..." : "Inject to Knowledge Base"}
        </CButton>
      </div>

      {/* Messages */}
      <div className="flex flex-col gap-3 p-4 max-h-80 overflow-y-auto">
        {lessons.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex gap-3 animate-fade-in-up",
              msg.type === "system" && "opacity-70"
            )}
          >
            <div className="shrink-0 mt-0.5">
              {msg.type === "ai" ? (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-climb-mint-subtle text-climb-mint">
                  <BrainIcon className="h-3 w-3" />
                </div>
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground font-mono text-[8px] font-bold">
                  SYS
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <p
                className={cn(
                  "text-xs leading-relaxed",
                  msg.type === "ai"
                    ? "text-foreground"
                    : "text-muted-foreground font-mono"
                )}
              >
                {msg.content}
              </p>
              <span className="font-mono text-[9px] text-muted-foreground/50">
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
