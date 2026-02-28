"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import useSWR from "swr";
import { Area, AreaChart, YAxis } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type MetricsResponse = {
  totalFollowers: number;
  totalProjectViews: number;
  totalProjects: number;
  yearsActive: number;
  lastUpdated: string;
};

interface Metric {
  key: string;
  label: string;
  description: string;
  fallback: number;
  suffix: string;
  format?: (n: number) => string;
  render?: (display: string) => React.ReactNode;
}

const METRICS: Metric[] = [
  {
    key: "totalFollowers",
    label: "Client Followers",
    description: "Combined across all clients",
    fallback: 38_000_000,
    suffix: "",
    format: (n) => n.toLocaleString("en-US"),
  },
  {
    key: "totalProjectViews",
    label: "Project Views",
    description: "Total views on embedded content",
    fallback: 120_000_000,
    suffix: "",
    format: (n) => n.toLocaleString("en-US"),
  },
  {
    key: "totalProjects",
    label: "Completed Projects",
    description: "Maps, designs, events & more",
    fallback: 0,
    suffix: "+",
  },
  {
    key: "yearsActive",
    label: "Years Creating",
    description: "Continuously since 2018",
    fallback: new Date().getFullYear() - 2018,
    suffix: "",
    format: (n) => String(n),
    render: (display) => (
      <>
        {display} <span className="text-[#ef4242]">YRS+</span>
      </>
    ),
  },
];

const PROJECT_VIEWS_FALLBACK = METRICS.find((metric) => metric.key === "totalProjectViews")?.fallback ?? 120_000_000;
const CREATOR_FOLLOWERS_LIVE_START = 189_232_941;
const FOLLOWERS_STORAGE_KEY = "mdcran_live_followers_floor_v1";
const FOLLOWERS_STATE_STORAGE_KEY = "mdcran_live_followers_state_v1";
const PROJECT_VIEWS_STATE_STORAGE_KEY = "mdcran_live_project_views_state_v1";
const PROJECT_VIEW_ESTIMATE_FLOOR = 2.4;
const PROJECT_VIEW_ESTIMATE_CAP = 18;
const PROJECT_VIEW_CORRECTION_MS = 10 * 60 * 1000;
const FOLLOWER_ESTIMATE_FLOOR = 3.2;
const FOLLOWER_ESTIMATE_CAP = 24;
const FOLLOWER_DRIFT_HOLD_MIN = 2;
const FOLLOWER_DRIFT_HOLD_MAX = 6;
const PROJECT_DRIFT_HOLD_MIN = 2;
const PROJECT_DRIFT_HOLD_MAX = 7;

function appendTrendPoint(points: Array<{ slot: number; views: number }>, value: number) {
  const next = [...points, { slot: points.length, views: value }];
  return next.slice(-18).map((point, index) => ({ ...point, slot: index }));
}

type StoredMetricState = {
  display: number;
  floor?: number;
  rate?: number;
  savedAt: number;
};

function LiveMetricBackground({
  data,
  color,
  gradientId,
  forceUpward = false,
}: {
  data: Array<{ slot: number; views: number }>;
  color: string;
  gradientId: string;
  forceUpward?: boolean;
}) {
  const chartData = React.useMemo(() => {
    const smoothed = data.map((point, index) => {
      const prev = data[Math.max(0, index - 1)]?.views ?? point.views;
      const next = data[Math.min(data.length - 1, index + 1)]?.views ?? point.views;
      return {
        slot: point.slot,
        views: prev * 0.2 + point.views * 0.6 + next * 0.2,
      };
    });

    if (!forceUpward) {
      return smoothed;
    }

    const start = smoothed[0]?.views ?? 0;
    const endBase = Math.max(smoothed[smoothed.length - 1]?.views ?? start, start + 1);
    const span = Math.max(endBase - start, 1);

    return smoothed.reduce<Array<{ slot: number; views: number }>>((acc, point, index) => {
      const target = start + ((endBase - start) * index) / Math.max(smoothed.length - 1, 1);
      const previous = acc[index - 1]?.views ?? start;
      const wiggleSource = point.views - target;
      const wiggle = Math.max(-span * 0.012, Math.min(span * 0.006, wiggleSource * 0.08));
      const candidate = target + wiggle;
      acc.push({
        slot: point.slot,
        views:
          index === 0
            ? start
            : Math.max(previous - span * 0.008, Math.min(previous + span * 0.12, candidate)),
      });
      return acc;
    }, []);
  }, [data, forceUpward]);

  const chartStats = React.useMemo(() => {
    const min = Math.min(...chartData.map((point) => point.views));
    const max = Math.max(...chartData.map((point) => point.views));
    const rawRange = Math.max(max - min, 1);
    const effectiveRange = forceUpward ? Math.max(rawRange, 8) : rawRange;
    const lowerPadding = forceUpward ? effectiveRange * 0.08 : effectiveRange * 0.35;
    const upperPadding = forceUpward ? effectiveRange * 0.12 : effectiveRange * 0.35;

    return {
      min,
      max,
      lowerBound: Math.max(0, min - lowerPadding),
      upperBound: max + upperPadding,
    };
  }, [chartData, forceUpward]);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 top-11 opacity-80">
      <ChartContainer
        config={{ views: { label: "Views", color } }}
        className="h-full w-full [&_.recharts-surface]:overflow-visible"
      >
        <AreaChart data={chartData} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
          <YAxis
            hide
            domain={[
              () => chartStats.lowerBound,
              () => chartStats.upperBound,
            ]}
          />
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color.replace("0.9", "0.42")} />
              <stop offset="55%" stopColor={color.replace("0.9", "0.22")} />
              <stop offset="100%" stopColor={color.replace("0.9", "0")} />
            </linearGradient>
          </defs>
          <Area
            type="linear"
            dataKey="views"
            stroke="var(--color-views)"
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive
            animationDuration={900}
            dot={false}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  );
}

function AnimatedNumber({
  value,
  format,
  suffix,
  render,
}: {
  value: number;
  format?: (n: number) => string;
  suffix: string;
  render?: (display: string) => React.ReactNode;
}) {
  const [display, setDisplay] = useState("0");
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const duration = 2000;
    const steps = 80;
    let current = 0;
    const increment = value / steps;
    const timer = setInterval(() => {
      current = Math.min(current + increment, value);
      if (format) {
        setDisplay(format(Math.floor(current)));
      } else {
        setDisplay(String(Math.floor(current)));
      }
      if (current >= value) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, value, format]);

  return (
    <span ref={ref} className="stat-value text-white tracking-tight leading-none">
      {render ? render(display) : display}
      {!format && <span className="text-[#ef4242]">{suffix}</span>}
    </span>
  );
}

export default function Stats() {
  const [followersDisplayValue, setFollowersDisplayValue] = useState(CREATOR_FOLLOWERS_LIVE_START);
  const [followersTrend, setFollowersTrend] = useState(() =>
    Array.from({ length: 18 }, (_, index) => ({ slot: index, views: CREATOR_FOLLOWERS_LIVE_START }))
  );
  const [projectDisplayValue, setProjectDisplayValue] = useState(PROJECT_VIEWS_FALLBACK);
  const [projectTrend, setProjectTrend] = useState(() =>
    Array.from({ length: 18 }, (_, index) => ({ slot: index, views: PROJECT_VIEWS_FALLBACK }))
  );
  const followersDisplayRef = useRef(CREATOR_FOLLOWERS_LIVE_START);
  const followersFloorRef = useRef(CREATOR_FOLLOWERS_LIVE_START);
  const followersRateRef = useRef(FOLLOWER_ESTIMATE_FLOOR);
  const followerDriftHoldRef = useRef(0);
  const followerDriftDirectionRef = useRef<"up" | "dip">("up");
  const projectDisplayRef = useRef(PROJECT_VIEWS_FALLBACK);
  const projectActualRef = useRef(PROJECT_VIEWS_FALLBACK);
  const projectRateRef = useRef(PROJECT_VIEW_ESTIMATE_FLOOR);
  const projectDriftHoldRef = useRef(0);
  const projectDriftModeRef = useRef<"cruise" | "crawl">("cruise");
  const lastActualSyncRef = useRef(0);
  const lastCorrectionRef = useRef(0);
  const restoredProjectStateRef = useRef(false);

  useEffect(() => {
    followersDisplayRef.current = followersDisplayValue;
  }, [followersDisplayValue]);

  useEffect(() => {
    projectDisplayRef.current = projectDisplayValue;
  }, [projectDisplayValue]);

  useEffect(() => {
    let frameId = 0;

    try {
      const now = Date.now();
      const storedValue = window.localStorage.getItem(FOLLOWERS_STORAGE_KEY);
      const parsed = storedValue ? Number(storedValue) : NaN;
      const storedFollowerState = window.localStorage.getItem(FOLLOWERS_STATE_STORAGE_KEY);
      const parsedFollowerState = storedFollowerState
        ? (JSON.parse(storedFollowerState) as StoredMetricState)
        : null;
      const storedProjectState = window.localStorage.getItem(PROJECT_VIEWS_STATE_STORAGE_KEY);
      const parsedProjectState = storedProjectState
        ? (JSON.parse(storedProjectState) as StoredMetricState)
        : null;

      if (Number.isFinite(parsed) && parsed > CREATOR_FOLLOWERS_LIVE_START) {
        const restored = Math.floor(parsed);
        followersFloorRef.current = restored;
        followersDisplayRef.current = restored;
        frameId = window.requestAnimationFrame(() => {
          setFollowersDisplayValue(restored);
          setFollowersTrend(
            Array.from({ length: 18 }, (_, index) => ({ slot: index, views: restored }))
          );
        });
      }

      if (
        parsedFollowerState &&
        Number.isFinite(parsedFollowerState.display) &&
        Number.isFinite(parsedFollowerState.savedAt)
      ) {
        const elapsedSeconds = Math.max(0, Math.min((now - parsedFollowerState.savedAt) / 1000, 300));
        const restoredRate = Math.min(
          Math.max(parsedFollowerState.rate ?? FOLLOWER_ESTIMATE_FLOOR, FOLLOWER_ESTIMATE_FLOOR),
          FOLLOWER_ESTIMATE_CAP
        );
        const restoredFloor = Math.max(
          followersFloorRef.current,
          Math.floor((parsedFollowerState.floor ?? parsedFollowerState.display) + elapsedSeconds * restoredRate * 0.45)
        );
        const restoredDisplay = Math.max(
          restoredFloor - restoredRate * 1.2,
          parsedFollowerState.display + elapsedSeconds * restoredRate * 0.18
        );

        followersFloorRef.current = restoredFloor;
        followersRateRef.current = restoredRate;
        followersDisplayRef.current = restoredDisplay;
        frameId = window.requestAnimationFrame(() => {
          setFollowersDisplayValue(restoredDisplay);
          setFollowersTrend(
            Array.from({ length: 18 }, (_, index) => ({
              slot: index,
              views: Math.round(restoredDisplay - (17 - index) * restoredRate * 0.25),
            }))
          );
        });
      }

      if (
        parsedProjectState &&
        Number.isFinite(parsedProjectState.display) &&
        Number.isFinite(parsedProjectState.savedAt)
      ) {
        const elapsedSeconds = Math.max(0, Math.min((now - parsedProjectState.savedAt) / 1000, 300));
        const restoredRate = Math.min(
          Math.max(parsedProjectState.rate ?? PROJECT_VIEW_ESTIMATE_FLOOR, PROJECT_VIEW_ESTIMATE_FLOOR),
          PROJECT_VIEW_ESTIMATE_CAP
        );
        const restoredDisplay = Math.max(
          parsedProjectState.display,
          parsedProjectState.display + elapsedSeconds * restoredRate * 0.32
        );

        restoredProjectStateRef.current = true;
        projectRateRef.current = restoredRate;
        projectDisplayRef.current = restoredDisplay;
        projectActualRef.current = Math.max(projectActualRef.current, restoredDisplay);
        frameId = window.requestAnimationFrame(() => {
          setProjectDisplayValue(restoredDisplay);
          setProjectTrend(
            Array.from({ length: 18 }, (_, index) => ({
              slot: index,
              views: Math.round(restoredDisplay - (17 - index) * restoredRate * 0.3),
            }))
          );
        });
      }
    } catch {
      // Ignore localStorage access issues and fall back to the built-in baseline.
    }

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  const { data } = useSWR<MetricsResponse>("/api/metrics", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 5_000,
    dedupingInterval: 4_000,
    keepPreviousData: true,
    onSuccess: (nextData) => {
      const actual = nextData.totalProjectViews;
      const now = Date.now();
      const previousActual = projectActualRef.current;
      const elapsedSeconds =
        lastActualSyncRef.current > 0 ? Math.max((now - lastActualSyncRef.current) / 1000, 5) : 5;
      const delta = actual - previousActual;
      const measuredRate = delta > 0 ? delta / elapsedSeconds : 0;
      const baselineRate = Math.min(
        Math.max(actual / 1_000_000_000, PROJECT_VIEW_ESTIMATE_FLOOR),
        PROJECT_VIEW_ESTIMATE_CAP
      );

      projectRateRef.current =
        measuredRate > 0
          ? Math.max(measuredRate, baselineRate)
          : Math.max(projectRateRef.current * 0.9, baselineRate);
      projectActualRef.current = actual;
      lastActualSyncRef.current = now;

      if (lastCorrectionRef.current === 0 && !restoredProjectStateRef.current) {
        lastCorrectionRef.current = now;
        projectDisplayRef.current = actual;
        setProjectDisplayValue(actual);
        setProjectTrend((prev) => appendTrendPoint(prev, actual));
      }
    },
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      if (followerDriftHoldRef.current <= 0) {
        followerDriftDirectionRef.current = Math.random() < 0.16 ? "dip" : "up";
        followerDriftHoldRef.current =
          FOLLOWER_DRIFT_HOLD_MIN +
          Math.floor(Math.random() * (FOLLOWER_DRIFT_HOLD_MAX - FOLLOWER_DRIFT_HOLD_MIN + 1));
      }

      const followerShouldDip = followerDriftDirectionRef.current === "dip";
      const followerVariance = followerShouldDip
        ? 0.88 + Math.random() * 0.16
        : 0.72 + Math.random() * 0.58;
      const nextFollowerFloor = followersFloorRef.current + followersRateRef.current * (0.55 + Math.random() * 0.45);
      const roundedFollowerFloor = Math.floor(nextFollowerFloor);
      const previousRoundedFollowerFloor = Math.floor(followersFloorRef.current);

      followersFloorRef.current = nextFollowerFloor;

      if (roundedFollowerFloor > previousRoundedFollowerFloor) {
        try {
          window.localStorage.setItem(FOLLOWERS_STORAGE_KEY, String(roundedFollowerFloor));
        } catch {
          // Ignore localStorage write issues during live metric animation.
        }
      }

      const followerDrift = followerShouldDip
        ? -(followersRateRef.current * (0.018 + Math.random() * 0.04))
        : followersRateRef.current * followerVariance;
      const nextFollowers = Math.max(
        followersFloorRef.current - followersRateRef.current * 1.5,
        followersDisplayRef.current + followerDrift
      );
      followersRateRef.current = Math.min(
        Math.max(
          followerShouldDip
            ? followersRateRef.current * (0.997 + Math.random() * 0.001)
            : followersRateRef.current * (1.0004 + Math.random() * 0.0028),
          FOLLOWER_ESTIMATE_FLOOR
        ),
        FOLLOWER_ESTIMATE_CAP
      );
      followerDriftHoldRef.current = Math.max(0, followerDriftHoldRef.current - 1);
      followersDisplayRef.current = nextFollowers;
      try {
        window.localStorage.setItem(
          FOLLOWERS_STATE_STORAGE_KEY,
          JSON.stringify({
            display: Math.round(nextFollowers),
            floor: Math.round(followersFloorRef.current),
            rate: followersRateRef.current,
            savedAt: now,
          } satisfies StoredMetricState)
        );
      } catch {
        // Ignore localStorage write issues during live metric animation.
      }
      setFollowersDisplayValue(nextFollowers);
      setFollowersTrend((prev) => appendTrendPoint(prev, Math.round(nextFollowers)));

      if (projectDriftHoldRef.current <= 0) {
        projectDriftModeRef.current = Math.random() < 0.28 ? "crawl" : "cruise";
        projectDriftHoldRef.current =
          PROJECT_DRIFT_HOLD_MIN +
          Math.floor(Math.random() * (PROJECT_DRIFT_HOLD_MAX - PROJECT_DRIFT_HOLD_MIN + 1));
      }

      const baseRate = projectRateRef.current;
      const drift =
        projectDriftModeRef.current === "crawl"
          ? baseRate * (0.06 + Math.random() * 0.12)
          : baseRate * (0.52 + Math.random() * 0.58);
      let nextValue = Math.max(projectDisplayRef.current, projectDisplayRef.current + drift);

      if (lastCorrectionRef.current > 0 && now - lastCorrectionRef.current >= PROJECT_VIEW_CORRECTION_MS) {
        nextValue = Math.max(nextValue, projectActualRef.current);
        lastCorrectionRef.current = now;
      }

      projectDriftHoldRef.current = Math.max(0, projectDriftHoldRef.current - 1);
      projectDisplayRef.current = nextValue;
      try {
        window.localStorage.setItem(
          PROJECT_VIEWS_STATE_STORAGE_KEY,
          JSON.stringify({
            display: Math.round(nextValue),
            rate: projectRateRef.current,
            savedAt: now,
          } satisfies StoredMetricState)
        );
      } catch {
        // Ignore localStorage write issues during live metric animation.
      }
      setProjectDisplayValue(nextValue);
      setProjectTrend((prev) => appendTrendPoint(prev, Math.round(nextValue)));
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="py-24 border-y border-white/6 overflow-hidden">
      <div className="content-container">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0 }}
          className="flex items-center gap-3 mb-14"
        >
          <div className="h-px w-8 bg-[#ef4242]" />
          <span className="text-[#ef4242] text-[11px] tracking-[0.25em] uppercase">By the Numbers</span>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {METRICS.map((metric, i) => {
            const isFollowers = metric.key === "totalFollowers";
            const isProjectViews = metric.key === "totalProjectViews";
            const isLiveMetric = isFollowers || isProjectViews;
            const value = data?.[metric.key as keyof MetricsResponse] ?? metric.fallback;
            const displayedProjectViews = Math.max(
              Math.round(projectDisplayValue),
              typeof value === "number" ? value : PROJECT_VIEWS_FALLBACK
            );
            const displayedFollowers = Math.round(followersDisplayValue);

            return (
              <motion.div
                key={metric.key}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0 }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="group h-full"
              >
                <div className="relative h-full min-h-[138px] md:min-h-[148px] p-5 md:p-6 rounded-sm border border-white/7 bg-white/2 overflow-hidden transition-all duration-500 hover:border-[rgba(239,66,66,0.25)] hover:bg-white/4 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(239,66,66,0.08)]">
                  {isFollowers && (
                    <LiveMetricBackground
                      data={followersTrend}
                      color="rgba(34,197,94,0.9)"
                      gradientId="followers-live-fill"
                    />
                  )}
                  {isProjectViews && (
                    <LiveMetricBackground
                      data={projectTrend}
                      color="rgba(34,197,94,0.9)"
                      gradientId="project-views-fill"
                      forceUpward
                    />
                  )}
                  <div className="absolute -top-8 -right-8 w-20 h-20 rounded-full bg-[#ef4242] opacity-0 group-hover:opacity-[0.08] blur-xl transition-opacity duration-500" />
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-[#ef4242] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  {isLiveMetric && (
                    <span className="absolute right-5 top-5 z-10 flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.45)]" />
                    </span>
                  )}

                  <div className="relative z-10 flex h-full flex-col justify-center text-left">
                    <div className="mb-2">
                      {isFollowers ? (
                        <span className="stat-value text-white tracking-tight leading-none">
                          {displayedFollowers.toLocaleString("en-US")}
                        </span>
                      ) : isProjectViews ? (
                        <span className="stat-value text-white tracking-tight leading-none">
                          {displayedProjectViews.toLocaleString("en-US")}
                        </span>
                      ) : (
                        <AnimatedNumber
                          value={value as number}
                          format={metric.format}
                          suffix={metric.suffix}
                          render={metric.render}
                        />
                      )}
                    </div>
                    <div className="text-xs text-white/75 font-jb tracking-wider uppercase">{metric.label}</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
