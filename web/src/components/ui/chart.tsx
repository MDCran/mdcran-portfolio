"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    color?: string;
  }
>;

type ChartContextValue = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextValue | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("Chart components must be used inside a ChartContainer.");
  }

  return context;
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
  }
>(({ className, children, config, style, ...props }, ref) => {
  const chartVars = Object.fromEntries(
    Object.entries(config).flatMap(([key, item]) =>
      item.color ? [[`--color-${key}`, item.color]] : []
    )
  ) as React.CSSProperties;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        className={cn(
          "h-full w-full text-xs",
          "[&_.recharts-cartesian-axis-line]:stroke-white/8",
          "[&_.recharts-cartesian-grid_line]:stroke-white/6",
          "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-white/5",
          "[&_.recharts-reference-line-line]:stroke-white/10",
          "[&_.recharts-sector[stroke='#fff']]:stroke-transparent",
          "[&_.recharts-text]:fill-white/50",
          className
        )}
        style={{ ...chartVars, ...style }}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "ChartContainer";

const ChartTooltip = RechartsPrimitive.Tooltip;

type TooltipEntry = {
  color?: string;
  dataKey?: string;
  name?: string;
  value?: number | string;
};

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    active?: boolean;
    payload?: TooltipEntry[];
    label?: string | number;
    hideLabel?: boolean;
    nameKey?: string;
    labelKey?: string;
  }
>(({ active, payload, label, className, hideLabel = false, nameKey, labelKey, ...props }, ref) => {
  const { config } = useChart();

  if (!active || !payload?.length) {
    return null;
  }

  const labelConfig = labelKey ? config[labelKey] : undefined;

  return (
    <div
      ref={ref}
      className={cn(
        "min-w-[180px] rounded-sm border border-white/10 bg-[#0d0d0d]/95 px-3 py-2 shadow-2xl backdrop-blur",
        className
      )}
      {...props}
    >
      {!hideLabel && (
        <div className="mb-2 text-[10px] tracking-widest uppercase text-white/35">
          {labelConfig?.label ?? label}
        </div>
      )}
      <div className="space-y-1.5">
        {payload.map((entry, index) => {
          const keyedEntry = entry as TooltipEntry & Record<string, unknown>;
          const key = String(
            (nameKey ? keyedEntry[nameKey] : undefined) ?? entry.dataKey ?? entry.name ?? index
          );
          const itemConfig = config[key] ?? config[String(entry.dataKey ?? "")];

          return (
            <div key={`${key}-${index}`} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.color ?? itemConfig?.color ?? "rgba(239,66,66,0.8)" }}
                />
                <span className="text-[11px] text-white/60">
                  {itemConfig?.label ?? entry.name ?? entry.dataKey}
                </span>
              </div>
              <span className="font-nord text-xs text-white">{entry.value ?? 0}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
});
ChartTooltipContent.displayName = "ChartTooltipContent";

export { ChartContainer, ChartTooltip, ChartTooltipContent };
