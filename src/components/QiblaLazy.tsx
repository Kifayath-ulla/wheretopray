"use client";
import dynamic from "next/dynamic";
const QiblaCompass = dynamic(() => import("./QiblaCompass"), { ssr: false, loading: () => <div className="mx-auto aspect-square w-full max-w-sm animate-pulse rounded-full bg-surface-2" /> });
export default QiblaCompass;
