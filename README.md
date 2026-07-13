

Terratime is a global visualization platform built to map historical climate and weather data across time. By layering temperature, precipitation, and wind metrics onto an interactive global map, Terratime enables users to search for regions, animate historical timeframes, analyze trends, and share localized imagery to document environmental changes over time.

---

## 🏗️ Architecture Overview

To efficiently process heavy scientific weather datasets (such as NetCDF or GRIB formats) without degrading frontend browser performance, Terratime utilizes a decoupled **Microservice Architecture**:

```text
[ Next.js Client (TypeScript + Mapbox) ]
               │
               ▼ (API Requests)
   [ Node.js API Gateway ] ─── (Heavy Math) ──► [ Python Data Service ]
                │                                          │
                ▼ (Quick Reads)                            ▼
     [ Cached Tile Data ]                       [ Processes NetCDF Data ]
```
1. **Frontend (Next.js + TypeScript + Mapbox GL JS)**: Handles high-performance GPU-accelerated map rendering, UI controls, timeline animations, and user search.
2. **API Gateway (Node.js)**: Serves as the primary application logic layer, orchestrating authentication, managing user-shared location imagery, and proxying data requests.
3. **Data Engine (Python)**: Utilizes scientific data libraries to open large-scale multidimensional weather arrays, extract specific slices, and calculate statistical trend regressions on the fly.

---

## 🛠️ Tech Stack & Key Libraries

### Frontend
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Mapping Engine**: Mapbox GL JS (via `react-map-gl`)
- **Styling**: Tailwind CSS

### Backend & Data Processing
- **Primary API Gateway**: Node.js (Express / NestJS)
- **Scientific Computing Service**: Python 3
- **Core Python Libraries**:
  - `xarray`: For multi-dimensional climate array slicing.
  - `netcdf4` / `cfgrib`: For reading binary weather formats.
  - `numpy` & `scipy`: For linear regression and localized trend analysis.
  - `FastAPI`: For ultra-fast Python-to-Node microservice communication.

---

## 📊 Recommended Global Weather Datasets

Terratime focuses on global gridded (raster) datasets to provide seamless interpolation across the world map:

- **[ERA5 (Copernicus Climate Change Service)](https://copernicus.eu)**: Global hourly gridded reanalysis dataset providing temperature, wind components, and precipitation from 1940 to present.
- **[NOAA NCEP/NCAR Reanalysis](https://noaa.gov)**: Excellent resource for long-term daily atmospheric data ideal for running multi-decade trend models.
- **[NASA POWER API](https://nasa.gov)**: Free, map-ready API delivering solar, temperature, and wind data globally without local hosting constraints.

---

## ⚡ Core Features Implementation Plan

### ⏱️ Time-Frame Animation
To avoid crashing the user's browser, historical files are not loaded directly on the client. The frontend timeline slider queries a dynamic tile server or a sequential cache. Moving the timeline slider rapidly swaps out or interpolates the `source` URL of the Mapbox raster layer.

### 🎨 Layer Visualizations
- **Temperature Heatmaps**: Rendered as a smooth, semi-transparent color gradient spanning from deep blue (cold) to deep red (hot).
- **Precipitation Overlays**: Displayed using a blue-to-purple radar-style color scheme.
- **Wind Vector Flow**: Rendered using a specialized canvas overlay (WebGL shader or particle animation layer) to mimic flow direction and velocity vectors.

### 📈 Statistical Trend Analysis
When a user selects a region and requests a trend analysis, the Python data service opens the historical array for that boundary box, runs a linear regression analysis over the requested decades, and passes a lightweight JSON payload or trend map tile back to the client interface.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- Python (3.10+ recommended)
- A Mapbox Public Access Token

### 1. Frontend & API Gateway Installation
Clone the repository and install the Next.js dependencies:
```bash
git clone https://github.com
cd terratime
npm install
```

Set up your environment variables by creating a `.env.local` file:
```env
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here
```

Run the local development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application map.

### 2. Python Data Service Setup (Example)
Create a virtual environment for the backend data processor:
```bash
cd path/to/python-service
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install xarray netcdf4 numpy fastapi uvicorn
```

---

## 📝 License
This project is licensed under the MIT License - see the LICENSE file for details.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
