"use client";

import useSWR from "swr";
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

type TapPoint = {
  id: string;
  label: string;
  type: "article" | "project";
  taps: number;
};

type AnalyticsResponse = {
  totalTaps: number;
  taps: TapPoint[];
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const chartConfig = {
  taps: {
    label: "Taps",
    color: "rgba(239,66,66,0.85)",
  },
} satisfies ChartConfig;

function truncateLabel(label: string) {
  return label.length > 22 ? `${label.slice(0, 22)}...` : label;
}

export default function TapsChart() {
  const { data } = useSWR<AnalyticsResponse>("/api/admin/analytics", fetcher, {
    revalidateOnFocus: false,
  });

  const points = data?.taps ?? [];

  return (
    <Card className="border-white/7 bg-white/2">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-white">Tap Activity</CardTitle>
        <CardDescription>
          Top tapped articles and projects. Total taps: {data?.totalTaps ?? 0}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {points.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center rounded-sm border border-white/6 bg-white/2 text-xs text-white/30">
            No taps yet.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[300px]">
            <BarChart data={points} layout="vertical" margin={{ left: 8, right: 18, top: 8, bottom: 8 }}>
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="label"
                type="category"
                width={150}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
                tickFormatter={truncateLabel}
              />
              <XAxis
                dataKey="taps"
                type="number"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                allowDecimals={false}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="taps" radius={3}>
                {points.map((point) => (
                  <Cell
                    key={point.id}
                    fill={point.type === "article" ? "rgba(239,66,66,0.85)" : "rgba(56,189,248,0.8)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
