"use client";
import dynamic from "next/dynamic";
const GapMap = dynamic(() => import("./GapMap"), { ssr: false, loading: () => <div className="h-[420px] w-full animate-pulse rounded-2xl bg-surface-2" /> });
export default GapMap;
