'use client';

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import {
  Maximize2,
  Minimize2,
  MapPin,
  Layers,
  Settings,
  CloudLightning,
} from 'lucide-react';
import {
  LocationInfo,
  Contribution,
  ClimateGridData,
  ActiveLayers,
} from '../types';

interface GlobeMapProps {
  mapboxToken: string;
  currentYear: number;
  selectedLocation: LocationInfo | null;
  onSelectLocationByClick: (lat: number, lng: number, name: string) => void;
  contributions: Contribution[];
  onSelectContribution: (contribution: Contribution) => void;
  isUploadMode: boolean;
  onSetUploadCoords: (lat: number, lng: number) => void;
  uploadCoords: { lat: number; lng: number } | null;
  activeLayers: ActiveLayers;
  mapStyle: 'satellite' | 'dark';
}

interface Particle {
  x: number;
  y: number;
  history: { x: number; y: number }[];
  life: number;
  maxLife: number;
}

export default function GlobeMap({
  mapboxToken,
  currentYear,
  selectedLocation,
  onSelectLocationByClick,
  contributions,
  onSelectContribution,
  isUploadMode,
  onSetUploadCoords,
  uploadCoords,
  activeLayers,
  mapStyle,
}: GlobeMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const uploadMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [projection, setProjection] = useState<'globe' | 'mercator'>('globe');
  const [climateData, setClimateData] = useState<ClimateGridData | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Dynamically update NASA satellite basemap tiles to match the calendar timeline
  // useEffect(() => {
  //   if (!mapRef.current || !mapLoaded) return;

  //   const map = mapRef.current;
  //   const source = map.getSource(
  //     'nasa-historical',
  //   ) as mapboxgl.RasterTileSource;

  //   if (source) {
  //     // 1. Generate the calendar target string
  //     // Standardize a mid-season date (like June 15th for summer, Dec 15th for winter)
  //     // or bind it to your slider month
  //     const paddedMonth = String((currentYear % 12) + 1).padStart(2, '0');
  //     const formattedDate = `${currentYear}-${paddedMonth}-15`;

  //     // 2. Set the new tile URL template
  //     const newTiles = [
  //       `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${formattedDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
  //     ];

  //     // This triggers Mapbox to gracefully swap out the background tiles in the background
  //     source.setTiles(newTiles);
  //   }
  // }, [currentYear, mapLoaded]);

  // Load global climate grid dataset
  useEffect(() => {
    fetch('/data/global-climate-grid.json')
      .then((res) => res.json())
      .then((data) => setClimateData(data))
      .catch((err) => console.error('Error loading climate grid:', err));
  }, []);

  // Handle map creation & style changes
  useEffect(() => {
    if (!mapContainerRef.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    const styleUrl =
      mapStyle === 'satellite'
        ? 'mapbox://styles/mapbox/satellite-v9'
        : 'mapbox://styles/mapbox/dark-v11';

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: styleUrl,
      center: [0, 20],
      zoom: 1.5,
      projection: projection,
      renderWorldCopies: true,
    });

    mapRef.current = map;

    // Create rendering canvas for overlays
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    canvasRef.current = canvas;

    // const setupLayers = () => {
    //   if (!map.getSource('climate-canvas')) {
    //     map.addSource('climate-canvas', {
    //       type: 'canvas',
    //       canvas: canvas,
    //       animate: true,
    //       coordinates: [
    //         [-180, 85],
    //         [180, 85],
    //         [180, -85],
    //         [-180, -85],
    //       ],
    //     });

    //     map.addLayer({
    //       id: 'climate-layer',
    //       type: 'raster',
    //       source: 'climate-canvas',
    //       paint: {
    //         'raster-opacity': mapStyle === 'satellite' ? 0.55 : 0.45,
    //         'raster-fade-duration': 0,
    //       },
    //     });
    //   }
    // };

    const setupLayers = () => {
      // 1. Add NASA's historical satellite tile source
      if (!map.getSource('nasa-historical')) {
        map.addSource('nasa-historical', {
          type: 'raster',
          tiles: [
            // We start with a baseline placeholder date matching your timeline starting point
            `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/2020-06-15/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
          ],
          tileSize: 256,
          attribution: 'NASA EOSDIS GIBS',
        });

        // 2. Add the NASA imagery layer, inserting it underneath your climate overlay canvas
        map.addLayer({
          id: 'nasa-layer',
          type: 'raster',
          source: 'nasa-historical',
          paint: {
            'raster-opacity': 1.0,
          },
        });
      }

      // Your existing climate canvas overlay layer setup goes here...
      if (!map.getSource('climate-canvas')) {
        map.addSource('climate-canvas', {
          type: 'canvas',
          canvas: canvas,
          animate: true,
          coordinates: [
            [-180, 85],
            [180, 85],
            [180, -85],
            [-180, -85],
          ],
        });

        map.addLayer({
          id: 'climate-layer',
          type: 'raster',
          source: 'climate-canvas',
          paint: {
            'raster-opacity': mapStyle === 'satellite' ? 0.55 : 0.45,
            'raster-fade-duration': 0,
          },
        });
      }
    };

    map.on('load', () => {
      setMapLoaded(true);
      setupLayers();
    });

    // In Mapbox, if style is switched, programmatically added sources and layers must be re-added
    map.on('style.load', () => {
      setupLayers();
    });

    map.on('click', (e) => {
      const { lng, lat } = e.lngLat;

      if (isUploadMode) {
        onSetUploadCoords(lat, lng);
      } else {
        const locationName = `Point (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`;
        onSelectLocationByClick(lat, lng, locationName);
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapboxToken, mapStyle]);

  // Handle Projection changes
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    mapRef.current.setProjection(projection);
  }, [projection, mapLoaded]);

  // Handle flyTo when selectedLocation changes
  useEffect(() => {
    if (!mapRef.current || !selectedLocation) return;
    mapRef.current.flyTo({
      center: [selectedLocation.longitude, selectedLocation.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 4),
      essential: true,
      duration: 2000,
    });
  }, [selectedLocation]);

  // ANIMATED RENDERING LOOP FOR CANVAS OVERLAYS (Temperature, Precipitation, Wind)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !climateData || !mapRef.current || !mapLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    // Initialize wind particles
    const numParticles = 350;
    const particles: Particle[] = [];
    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        history: [],
        life: Math.floor(Math.random() * 50) + 20,
        maxLife: 70,
      });
    }

    const { latitudes, longitudes } = climateData;
    const numLats = latitudes.length;
    const numLngs = longitudes.length;

    // Draw frame function
    const drawFrame = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const monthKey = String((currentYear % 12) + 1);
      const temps = climateData.tempGrid[monthKey];
      const precips = climateData.precipGrid[monthKey];
      const winds = climateData.windGrid[monthKey];

      if (!temps || !precips || !winds) return;

      // // 1. DRAW TEMPERATURE LAYER (Heatmap)
      // if (activeLayers.temperature) {
      //   const tempCanvas = document.createElement("canvas");
      //   tempCanvas.width = numLngs;
      //   tempCanvas.height = numLats;
      //   const tempCtx = tempCanvas.getContext("2d");

      //   if (tempCtx) {
      //     const imgData = tempCtx.createImageData(numLngs, numLats);
      //     for (let y = 0; y < numLats; y++) {
      //       const latIdx = numLats - 1 - y; // flip latitude indices for canvas Y
      //       for (let x = 0; x < numLngs; x++) {
      //         const val = temps[latIdx * numLngs + x];
      //         const pixelIdx = (y * numLngs + x) * 4;

      //         let r = 0, g = 0, b = 0, a = 0;
      //         if (val > 0) {
      //           const f = Math.min(val / 2.5, 1.0);
      //           r = 239 + f * 16;
      //           g = Math.max(0, Math.round(80 - f * 80));
      //           b = Math.max(0, Math.round(30 - f * 30));
      //           a = Math.round(40 + f * 180);
      //         } else if (val < 0) {
      //           const f = Math.min(Math.abs(val) / 1.5, 1.0);
      //           r = Math.max(0, Math.round(20 - f * 20));
      //           g = Math.round(80 + f * 90);
      //           b = 239 + f * 16;
      //           a = Math.round(40 + f * 130);
      //         }

      //         imgData.data[pixelIdx] = r;
      //         imgData.data[pixelIdx + 1] = g;
      //         imgData.data[pixelIdx + 2] = b;
      //         imgData.data[pixelIdx + 3] = a;
      //       }
      //     }
      //     tempCtx.putImageData(imgData, 0, 0);

      //     ctx.imageSmoothingEnabled = true;
      //     ctx.imageSmoothingQuality = "high";
      //     ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
      //   }
      // }

      // 1. DRAW TEMPERATURE LAYER (Standard Weather Map Gradient)
      if (activeLayers.temperature) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = numLngs;
        tempCanvas.height = numLats;
        const tempCtx = tempCanvas.getContext('2d');

        if (tempCtx) {
          const imgData = tempCtx.createImageData(numLngs, numLats);
          for (let y = 0; y < numLats; y++) {
            const latIdx = numLats - 1 - y; // flip latitude indices for canvas Y
            for (let x = 0; x < numLngs; x++) {
              const val = temps[latIdx * numLngs + x];
              const pixelIdx = (y * numLngs + x) * 4;

              let r = 0,
                g = 0,
                b = 0,
                a = 220; // baseline moderate opacity

              if (val <= 0) {
                // Freezing Zone (-30°C to 0°C): Dark Blue to Light Blue
                const f = Math.min(Math.abs(val) / 30.0, 1.0);
                r = Math.round(30 - f * 20); // 30 to 10
                g = Math.round(130 - f * 80); // 130 to 50
                b = Math.round(250 - f * 100); // 250 to 150
                a = Math.round(60 + f * 120); // colder = slightly more opaque
              } else if (val > 0 && val <= 12) {
                // Cool/Mild Zone (0°C to 12°C): Light Blue to Vibrant Green
                const f = val / 12.0;
                r = Math.round(30 + f * 5); // 30 to 35
                g = Math.round(130 + f * 90); // 130 to 220
                b = Math.round(250 - f * 170); // 250 to 80
              } else if (val > 12 && val <= 22) {
                // Warm Zone (12°C to 22°C): Green to Yellow/Orange
                const f = (val - 12) / 10.0;
                r = Math.round(35 + f * 215); // 35 to 250
                g = Math.round(220 + f * 10); // 220 to 230
                b = Math.round(80 - f * 80); // 80 to 0
              } else if (val > 22 && val <= 32) {
                // Hot Zone (22°C to 32°C): Orange to Bright Red
                const f = (val - 22) / 10.0;
                r = Math.round(250 + f * 5); // 250 to 255
                g = Math.round(230 - f * 180); // 230 to 50
                b = 0;
              } else {
                // Scorching Zone (> 32°C): Bright Red to Dark Purple/Crimson
                const f = Math.min((val - 32) / 10.0, 1.0);
                r = Math.round(255 - f * 120); // 255 to 135
                g = Math.round(50 - f * 50); // 50 to 0
                b = Math.round(f * 50); // 0 to 50
                a = 210; // High visibility for extreme heat
              }

              imgData.data[pixelIdx] = r;
              imgData.data[pixelIdx + 1] = g;
              imgData.data[pixelIdx + 2] = b;
              imgData.data[pixelIdx + 3] = a;
            }
          }
          tempCtx.putImageData(imgData, 0, 0);

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height);
        }
      }

      // 2. DRAW PRECIPITATION LAYER (Radar clouds)
      if (activeLayers.precipitation) {
        const precipCanvas = document.createElement('canvas');
        precipCanvas.width = numLngs;
        precipCanvas.height = numLats;
        const precipCtx = precipCanvas.getContext('2d');

        if (precipCtx) {
          const imgData = precipCtx.createImageData(numLngs, numLats);
          for (let y = 0; y < numLats; y++) {
            const latIdx = numLats - 1 - y;
            for (let x = 0; x < numLngs; x++) {
              const val = precips[latIdx * numLngs + x];
              const pixelIdx = (y * numLngs + x) * 4;

              let r = 0,
                g = 0,
                b = 0,
                a = 0;
              // Radar scheme: green -> blue -> purple
              if (val > 20) {
                if (val < 100) {
                  // Light/Medium Rain (Green)
                  r = 16;
                  g = 185;
                  b = 129;
                  a = Math.round(30 + ((val - 20) / 80) * 110);
                } else if (val < 200) {
                  // Heavy Rain (Blue)
                  r = 59;
                  g = 130;
                  b = 246;
                  a = Math.round(140 + ((val - 100) / 100) * 80);
                } else {
                  // Extreme Rain/Storm (Purple/Magenta)
                  r = 168;
                  g = 85;
                  b = 247;
                  a = Math.round(200 + Math.min((val - 200) / 100, 1.0) * 55);
                }
              }

              imgData.data[pixelIdx] = r;
              imgData.data[pixelIdx + 1] = g;
              imgData.data[pixelIdx + 2] = b;
              imgData.data[pixelIdx + 3] = a;
            }
          }
          precipCtx.putImageData(imgData, 0, 0);

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Draw with composite blending to overlay on top of temperature
          ctx.globalCompositeOperation = activeLayers.temperature
            ? 'source-over'
            : 'copy';
          ctx.drawImage(precipCanvas, 0, 0, canvas.width, canvas.height);
          ctx.globalCompositeOperation = 'source-over'; // restore standard
        }
      }

      // 3. DRAW AND UPDATE WIND PARTICLES (Flow Shaders)
      if (activeLayers.wind) {
        particles.forEach((p) => {
          // Map canvas coordinates to lat/lng indices to get local wind speeds
          const xPct = p.x / canvas.width;
          const yPct = p.y / canvas.height;

          // Lat goes top to bottom in canvas (index 10 down to 0)
          const latIdx = Math.max(
            0,
            Math.min(numLats - 1, Math.floor((1 - yPct) * numLats)),
          );
          const lngIdx = Math.max(
            0,
            Math.min(numLngs - 1, Math.floor(xPct * numLngs)),
          );

          const windSpeed = winds[latIdx * numLngs + lngIdx] || 15;
          const latVal = latitudes[latIdx];

          // Determine flow direction based on global circulation rules
          let angle = 0;
          if (latVal > -30 && latVal < 30) {
            // Trade Winds (Easterly: blows mostly West, moving left)
            angle = Math.PI + Math.sin(p.x / 30) * 0.25;
          } else if (
            (latVal >= 30 && latVal <= 65) ||
            (latVal <= -30 && latVal >= -65)
          ) {
            // Westerlies (blows mostly East, moving right)
            angle = Math.sin(p.x / 40) * 0.3;
          } else {
            // Polar easterlies (blows West, moving left)
            angle = Math.PI + Math.sin(p.x / 20) * 0.4;
          }

          // Particle Speed
          const speedFactor = windSpeed * 0.08;
          const dx = Math.cos(angle) * speedFactor;
          const dy = Math.sin(angle) * speedFactor;

          // Draw trailing history
          if (p.history.length > 1) {
            ctx.beginPath();
            ctx.moveTo(p.history[0].x, p.history[0].y);
            for (let h = 1; h < p.history.length; h++) {
              ctx.lineTo(p.history[h].x, p.history[h].y);
            }
            ctx.lineWidth = mapStyle === 'satellite' ? 1.5 : 1.2;

            // Glowing white-blue trails
            const alpha = p.life / p.maxLife;
            ctx.strokeStyle =
              mapStyle === 'satellite'
                ? `rgba(255, 255, 255, ${alpha * 0.7})`
                : `rgba(186, 230, 253, ${alpha * 0.85})`;

            ctx.stroke();
          }

          // Update position history
          p.history.unshift({ x: p.x, y: p.y });
          if (p.history.length > 5) p.history.pop();

          // Move particle
          p.x += dx;
          p.y += dy;
          p.life--;

          // Wrap horizontally
          if (p.x < 0) {
            p.x = canvas.width;
            p.history = [];
          } else if (p.x > canvas.width) {
            p.x = 0;
            p.history = [];
          }

          // Reset if dead or out of vertical bounds
          if (p.life <= 0 || p.y < 0 || p.y > canvas.height) {
            p.x = Math.random() * canvas.width;
            p.y = Math.random() * canvas.height;
            p.history = [];
            p.life = Math.floor(Math.random() * 50) + 20;
          }
        });
      }

      // Trigger map update
      const source = mapRef.current?.getSource(
        'climate-canvas',
      ) as mapboxgl.CanvasSource;
      if (source) {
        source.play();
      }

      animationFrameId = requestAnimationFrame(drawFrame);
    };

    // Run render loop
    drawFrame();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [currentYear, climateData, activeLayers, mapLoaded, mapStyle]);

  // Update User Contribution Markers
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    contributions.forEach((contrib) => {
      const el = document.createElement('div');
      el.className = 'marker-pulsing';
      el.title = contrib.title;

      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        onSelectContribution(contrib);
      });

      const popup = new mapboxgl.Popup({ offset: 15, closeButton: true })
        .setHTML(`
          <div class="flex flex-col gap-1.5 max-w-[200px]">
            <img src="${contrib.imageUrl}" class="w-full h-24 object-cover rounded-lg border border-white/10" alt="${contrib.title}" />
            <h4 class="font-bold text-xs text-white truncate">${contrib.title}</h4>
            <div class="flex justify-between items-center text-[10px] text-gray-400">
              <span>${contrib.date}</span>
              <span class="bg-blue-900/50 text-blue-300 px-1 rounded">${contrib.category}</span>
            </div>
            <p class="text-[10px] text-gray-300 line-clamp-2">${contrib.description}</p>
          </div>
        `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([contrib.lng, contrib.lat])
        .setPopup(popup)
        .addTo(mapRef.current!);

      markersRef.current.push(marker);
    });
  }, [contributions, mapLoaded]);

  // Handle temporary upload marker
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;

    if (uploadMarkerRef.current) {
      uploadMarkerRef.current.remove();
      uploadMarkerRef.current = null;
    }

    if (isUploadMode && uploadCoords) {
      const el = document.createElement('div');
      el.innerHTML =
        '<div class="w-6 h-6 flex items-center justify-center bg-red-500 rounded-full border-2 border-white text-white font-bold text-xs shadow-lg animate-bounce">📍</div>';

      uploadMarkerRef.current = new mapboxgl.Marker(el)
        .setLngLat([uploadCoords.lng, uploadCoords.lat])
        .addTo(mapRef.current);
    }
  }, [isUploadMode, uploadCoords, mapLoaded]);

  const toggleProjection = () => {
    setProjection(projection === 'globe' ? 'mercator' : 'globe');
  };

  return (
    <div className='relative w-full h-full'>
      {/* Map Container */}
      <div ref={mapContainerRef} className='w-full h-full' />

      {/* Floating UI controls */}
      <div className='absolute top-4 right-4 flex flex-col gap-2 z-40'>
        <button
          onClick={toggleProjection}
          className='flex items-center gap-2 px-3 py-2 text-xs font-semibold glass-panel text-white hover:bg-white/15 transition-all shadow-md active:scale-95'
          title='Switch projection view'
        >
          <Layers className='w-4 h-4 text-blue-400' />
          <span>{projection === 'globe' ? 'Flat Map' : 'Globe View'}</span>
        </button>
      </div>

      {/* Map details instructions */}
      <div className='absolute bottom-4 left-4 glass-panel px-3 py-2 text-[10px] text-gray-400 flex items-center gap-2 select-none pointer-events-none'>
        <MapPin className='w-3.5 h-3.5 text-blue-400' />
        <span>
          Click any land area to inspect climate metrics & historical trends.
        </span>
      </div>
    </div>
  );
}
