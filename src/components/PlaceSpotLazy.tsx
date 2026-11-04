"use client";
import dynamic from "next/dynamic";
export default dynamic(() => import("./PlaceSpot"), { ssr: false, loading: () => <div className="card h-64 animate-pulse bg-surface-2" /> });
