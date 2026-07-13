"use client";

import React, { useEffect, useState, useRef } from "react";
import { Play, Pause, ChevronLeft, ChevronRight, RotateCcw, FastForward } from "lucide-react";

interface TimelineProps {
  years: number[];
  currentYear: number;
  onYearChange: (year: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
}

export default function Timeline({
  years,
  currentYear,
  onYearChange,
  isPlaying,
  setIsPlaying
}: TimelineProps) {
  const [speed, setSpeed] = useState(1000); // ms per frame
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activeIndex = years.indexOf(currentYear);

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        onYearChange(years[(years.indexOf(currentYear) + 1) % years.length]);
      }, speed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentYear, speed, years, onYearChange]);

  const handleStepBack = () => {
    setIsPlaying(false);
    const newIndex = (activeIndex - 1 + years.length) % years.length;
    onYearChange(years[newIndex]);
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    const newIndex = (activeIndex + 1) % years.length;
    onYearChange(years[newIndex]);
  };

  const handleReset = () => {
    setIsPlaying(false);
    onYearChange(years[0]);
  };

  return (
    <div className="w-full glass-panel p-4 flex flex-col md:flex-row items-center gap-4 transition-all duration-300">
      {/* Controls */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleReset}
          className="p-2 hover:bg-white/10 active:bg-white/20 rounded-lg text-gray-400 hover:text-white transition-colors"
          title="Reset to 1900"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={handleStepBack}
          className="p-2 hover:bg-white/10 active:bg-white/20 rounded-lg text-gray-400 hover:text-white transition-colors"
          title="Step Back"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`p-3 rounded-full transition-all duration-300 ${
            isPlaying
              ? "bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]"
              : "bg-white text-black hover:bg-gray-200"
          }`}
          title={isPlaying ? "Pause" : "Play Animation"}
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
        </button>

        <button
          onClick={handleStepForward}
          className="p-2 hover:bg-white/10 active:bg-white/20 rounded-lg text-gray-400 hover:text-white transition-colors"
          title="Step Forward"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Timeline Slider */}
      <div className="flex-1 w-full flex flex-col gap-1">
        <div className="flex justify-between items-center text-xs text-gray-400 px-1 select-none">
          <span className="font-semibold text-blue-400 text-sm">{currentYear}</span>
          <span className="text-[10px] uppercase tracking-wider text-gray-500">Timeline slider</span>
          <span>2026</span>
        </div>
        <div className="relative flex items-center">
          <input
            type="range"
            min={0}
            max={years.length - 1}
            value={activeIndex}
            onChange={(e) => {
              setIsPlaying(false);
              onYearChange(years[parseInt(e.target.value)]);
            }}
            className="w-full accent-blue-500"
          />
        </div>
        {/* Ticks */}
        <div className="flex justify-between px-1 text-[9px] text-gray-600 select-none">
          {years.map((yr, idx) => (
            <span
              key={yr}
              onClick={() => {
                setIsPlaying(false);
                onYearChange(yr);
              }}
              className={`cursor-pointer transition-colors hover:text-gray-300 ${
                yr === currentYear ? "text-blue-400 font-bold" : ""
              }`}
            >
              {yr % 20 === 0 || yr === 2026 ? yr : "•"}
            </span>
          ))}
        </div>
      </div>

      {/* Speed Controls */}
      <div className="flex items-center gap-2 shrink-0 md:border-l md:border-panel-border md:pl-4">
        <FastForward className="w-4 h-4 text-gray-500" />
        <select
          value={speed}
          onChange={(e) => setSpeed(parseInt(e.target.value))}
          className="bg-transparent text-xs text-gray-300 border border-panel-border rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value={2000} className="bg-background">Slow (2s/yr)</option>
          <option value={1000} className="bg-background">Normal (1s/yr)</option>
          <option value={500} className="bg-background">Fast (0.5s/yr)</option>
          <option value={200} className="bg-background">Super Fast (0.2s/yr)</option>
        </select>
      </div>
    </div>
  );
}
