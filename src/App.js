import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "./firebase/AuthContext";
import { loadUserData, saveUserData } from "./firebase/firestore";
import { fetchFullPropertyAnalysis } from "./firebase/api";

const STATE_MARKET_DATA = {
  Colorado: {
    abbr: "CO", color: "#2dd4bf", accent: "#0d9488",
    gradient: "linear-gradient(135deg, #0d9488 0%, #115e59 100%)",
    medianPrice: 560000, medianPriceChange: -2.6, avgDaysOnMarket: 70,
    domChange: 20.7, inventory: 8228, inventoryChange: 7.0,
    mortgageRate: 6.2, forecastGrowth: 4, salesForecast: 14,
    listToSaleRatio: 97.94, marketType: "Buyer's Market",
    population: "5.9M", jobGrowth: "Slowing",
    topCities: [
      { name: "Denver", median: 599900, change: -2.0, dom: 70 },
      { name: "Co. Springs", median: 469500, change: -2.6, dom: 76 },
      { name: "Boulder", median: 785000, change: 1.2, dom: 52 },
      { name: "Fort Collins", median: 525000, change: -1.5, dom: 65 },
      { name: "Aurora", median: 455000, change: -5.5, dom: 80 },
    ],
    monthlyTrend: [
      { month: "Aug", median: 580000, listings: 7200 },{ month: "Sep", median: 575000, listings: 7400 },
      { month: "Oct", median: 570000, listings: 7600 },{ month: "Nov", median: 565000, listings: 7800 },
      { month: "Dec", median: 560000, listings: 7600 },{ month: "Jan", median: 558000, listings: 8228 },
    ],
    insights: [
      { type: "trend", text: "Market cooling continues from 2023; prices edged down marginally" },
      { type: "positive", text: "Existing home sales projected to rise 14% in 2026" },
      { type: "warning", text: "Insurance rates skyrocketing; HOA fees reducing condo affordability" },
      { type: "neutral", text: "Mortgage rates projected to settle near 6% in 2026" },
      { type: "positive", text: "Inventory growing \u2014 buyers have more options and negotiating power" },
      { type: "warning", text: "Job growth slowing more than expected; economic uncertainty persists" },
    ],
  },
  Utah: {
    abbr: "UT", color: "#f97316", accent: "#c2410c",
    gradient: "linear-gradient(135deg, #c2410c 0%, #7c2d12 100%)",
    medianPrice: 550000, medianPriceChange: 1.9, avgDaysOnMarket: 36,
    domChange: 24.1, inventory: 12500, inventoryChange: 9.0,
    mortgageRate: 6.2, forecastGrowth: 3.5, salesForecast: 8,
    listToSaleRatio: 98.2, marketType: "Balanced Market",
    population: "3.5M", jobGrowth: "1.5% (27K jobs)",
    topCities: [
      { name: "SLC", median: 550000, change: 2.0, dom: 36 },
      { name: "Provo", median: 485000, change: 3.2, dom: 40 },
      { name: "St. George", median: 520000, change: 1.5, dom: 55 },
      { name: "Ogden", median: 420000, change: 2.8, dom: 32 },
      { name: "Park City", median: 1250000, change: -1.0, dom: 90 },
    ],
    monthlyTrend: [
      { month: "Aug", median: 540000, listings: 11000 },{ month: "Sep", median: 542000, listings: 11400 },
      { month: "Oct", median: 545000, listings: 11800 },{ month: "Nov", median: 548000, listings: 12100 },
      { month: "Dec", median: 549000, listings: 12000 },{ month: "Jan", median: 550000, listings: 12500 },
    ],
    insights: [
      { type: "positive", text: "Salt Lake City named top-10 housing hot spot for 2026 by NAR" },
      { type: "neutral", text: "Market is 'running in place' \u2014 stable but not surging" },
      { type: "positive", text: "Strong millennial population in prime homebuying years driving demand" },
      { type: "warning", text: "Net migration slowing \u2014 lowest share of growth in 4 years" },
      { type: "trend", text: "60%+ mortgage holders locked below 4% \u2014 limiting turnover" },
      { type: "positive", text: "Mortgage loan applications growing 9.4% in SLC \u2014 buyers returning" },
    ],
  },
};

const PIPELINE_STAGES = [
  { id: "interested", label: "Interested", color: "#6366f1" },
  { id: "touring", label: "Touring", color: "#8b5cf6" },
  { id: "offer_submitted", label: "Offer Submitted", color: "#f59e0b" },
  { id: "under_contract", label: "Under Contract", color: "#3b82f6" },
  { id: "inspection", label: "Inspection", color: "#06b6d4" },
  { id: "appraisal", label: "Appraisal", color: "#10b981" },
  { id: "closing", label: "Closing", color: "#22c55e" },
  { id: "closed", label: "Closed", color: "#16a34a" },
];

const INIT_PROSPECTS = [
  {
    id: 9001, name: "Highlands Ranch Colonial", state: "Colorado", city: "Highlands Ranch",
    address: "9432 Crestmore Way, Highlands Ranch, CO 80129", type: "Single Family",
    bedrooms: 5, bathrooms: 4, sqft: 3200, yearBuilt: 2019, listPrice: 725000,
    stage: "under_contract", addedDate: "2026-01-10", notes: "Great school district, large backyard. Inspection scheduled Feb 12.",
    zillowEst: 718000, redfinEst: 710000, realtorEst: 730000,
    priceHistory: [{ date: "2026-01-05", price: 749000, event: "Listed" },{ date: "2026-01-18", price: 725000, event: "Price reduced" },{ date: "2026-01-28", event: "Offer accepted" }],
    marketAnalysis: { neighborhoodMedian: 695000, pricePerSqft: 227, neighborhoodAvgDOM: 45, comparableSales: [{ address: "9210 Crestmore Way", price: 710000, sqft: 3100, date: "2025-12-10" },{ address: "9501 Ridgeline Dr", price: 735000, sqft: 3350, date: "2025-11-20" },{ address: "9120 Summit View", price: 698000, sqft: 3050, date: "2026-01-05" }], appreciation5yr: 22.5, schoolRating: 9, crimeIndex: "Low", walkScore: 42 },
  },
  {
    id: 9002, name: "Boulder Craftsman", state: "Colorado", city: "Boulder",
    address: "2105 Spruce St, Boulder, CO 80302", type: "Single Family",
    bedrooms: 3, bathrooms: 2, sqft: 1950, yearBuilt: 1965, listPrice: 895000,
    stage: "touring", addedDate: "2026-02-01", notes: "Charming but needs kitchen update. Touring again Saturday.",
    zillowEst: 880000, redfinEst: 870000, realtorEst: 905000,
    priceHistory: [{ date: "2026-01-20", price: 895000, event: "Listed" }],
    marketAnalysis: { neighborhoodMedian: 850000, pricePerSqft: 459, neighborhoodAvgDOM: 38, comparableSales: [{ address: "2200 Pine St", price: 875000, sqft: 1900, date: "2025-12-15" },{ address: "1980 Spruce St", price: 920000, sqft: 2100, date: "2026-01-02" }], appreciation5yr: 18.3, schoolRating: 8, crimeIndex: "Very Low", walkScore: 78 },
  },
  {
    id: 9003, name: "Cottonwood Heights Rambler", state: "Utah", city: "Cottonwood Heights",
    address: "7845 S Wasatch Blvd, Cottonwood Heights, UT 84121", type: "Single Family",
    bedrooms: 4, bathrooms: 3, sqft: 2600, yearBuilt: 2005, listPrice: 620000,
    stage: "offer_submitted", addedDate: "2026-01-25", notes: "Near ski resorts. Offer at $610K submitted, waiting for response.",
    zillowEst: 615000, redfinEst: 608000, realtorEst: 625000,
    priceHistory: [{ date: "2026-01-15", price: 635000, event: "Listed" },{ date: "2026-01-22", price: 620000, event: "Price reduced" }],
    marketAnalysis: { neighborhoodMedian: 595000, pricePerSqft: 238, neighborhoodAvgDOM: 42, comparableSales: [{ address: "7900 S Wasatch Blvd", price: 605000, sqft: 2500, date: "2025-11-30" },{ address: "7720 Bengal Blvd", price: 630000, sqft: 2700, date: "2025-12-20" }], appreciation5yr: 28.1, schoolRating: 8, crimeIndex: "Low", walkScore: 35 },
  },
  {
    id: 9004, name: "Draper Modern", state: "Utah", city: "Draper",
    address: "1285 E Pioneer Rd, Draper, UT 84020", type: "Townhouse",
    bedrooms: 3, bathrooms: 2.5, sqft: 1800, yearBuilt: 2023, listPrice: 495000,
    stage: "interested", addedDate: "2026-02-05", notes: "New build, open house this weekend. HOA $220/mo.",
    zillowEst: 490000, redfinEst: 485000, realtorEst: 498000,
    priceHistory: [{ date: "2026-02-01", price: 495000, event: "Listed" }],
    marketAnalysis: { neighborhoodMedian: 475000, pricePerSqft: 275, neighborhoodAvgDOM: 30, comparableSales: [{ address: "1290 E Pioneer Rd", price: 488000, sqft: 1780, date: "2025-12-18" },{ address: "1310 E Pioneer Rd", price: 502000, sqft: 1820, date: "2026-01-10" }], appreciation5yr: 31.2, schoolRating: 7, crimeIndex: "Low", walkScore: 48 },
  },
];

const MOCK_PROPERTIES = [
  { id: 1, name: "Lakewood Estate", state: "Colorado", city: "Denver", address: "742 Evergreen Terrace, Denver, CO 80203", type: "Single Family", bedrooms: 4, bathrooms: 3, sqft: 2850, yearBuilt: 2018, purchasePrice: 485000, purchaseDate: "2020-03-15", valuations: { zillow: { value: 562000, change: 3.2, lastUpdated: "2026-02-01" }, redfin: { value: 555000, change: 2.8, lastUpdated: "2026-02-02" }, realtor: { value: 570000, change: 3.5, lastUpdated: "2026-01-30" } }, marketHistory: [{ month:"Aug",zillow:520000,redfin:515000,realtor:525000 },{ month:"Sep",zillow:528000,redfin:522000,realtor:530000 },{ month:"Oct",zillow:535000,redfin:530000,realtor:540000 },{ month:"Nov",zillow:545000,redfin:540000,realtor:550000 },{ month:"Dec",zillow:552000,redfin:548000,realtor:558000 },{ month:"Jan",zillow:558000,redfin:552000,realtor:565000 },{ month:"Feb",zillow:562000,redfin:555000,realtor:570000 }], expenses: [{ id:1,date:"2026-01-15",category:"Mortgage",amount:2150,description:"Monthly mortgage",recurring:true },{ id:2,date:"2026-01-20",category:"Insurance",amount:185,description:"Homeowners insurance",recurring:true },{ id:3,date:"2026-01-10",category:"Utilities",amount:320,description:"Electric + Gas + Water",recurring:true },{ id:4,date:"2026-01-25",category:"Maintenance",amount:450,description:"HVAC filter replacement",recurring:false,invoice:"INV-2026-001" },{ id:5,date:"2025-12-15",category:"Repairs",amount:1200,description:"Roof leak repair",recurring:false,invoice:"INV-2025-089" }], maintenance: [{ id:1,title:"HVAC Annual Service",status:"scheduled",priority:"medium",date:"2026-02-15",vendor:"CoolAir HVAC",notes:"Annual inspection",cost:250 },{ id:2,title:"Roof Leak - Master",status:"completed",priority:"high",date:"2025-12-10",vendor:"TopRoof Co.",notes:"Fixed flashing",cost:1200 },{ id:3,title:"Garage Door Spring",status:"in-progress",priority:"high",date:"2026-02-01",vendor:"DoorFix LLC",notes:"Torsion spring",cost:380 }] },
  { id: 2, name: "Downtown Condo", state: "Colorado", city: "Denver", address: "1200 16th St #405, Denver, CO 80202", type: "Condo", bedrooms: 2, bathrooms: 2, sqft: 1150, yearBuilt: 2021, purchasePrice: 375000, purchaseDate: "2022-07-20", valuations: { zillow: { value: 398000, change: 1.8, lastUpdated: "2026-02-01" }, redfin: { value: 392000, change: 1.5, lastUpdated: "2026-02-02" }, realtor: { value: 405000, change: 2.1, lastUpdated: "2026-01-29" } }, marketHistory: [{ month:"Aug",zillow:378000,redfin:374000,realtor:382000 },{ month:"Sep",zillow:382000,redfin:378000,realtor:386000 },{ month:"Oct",zillow:385000,redfin:381000,realtor:390000 },{ month:"Nov",zillow:390000,redfin:385000,realtor:395000 },{ month:"Dec",zillow:393000,redfin:388000,realtor:398000 },{ month:"Jan",zillow:395000,redfin:390000,realtor:402000 },{ month:"Feb",zillow:398000,redfin:392000,realtor:405000 }], expenses: [{ id:1,date:"2026-01-15",category:"Mortgage",amount:1850,description:"Monthly mortgage",recurring:true },{ id:2,date:"2026-01-10",category:"HOA",amount:425,description:"Monthly HOA dues",recurring:true },{ id:3,date:"2026-01-20",category:"Insurance",amount:95,description:"Condo insurance",recurring:true }], maintenance: [{ id:1,title:"Dishwasher Repair",status:"pending",priority:"medium",date:"2026-02-10",vendor:"AppliancePro",notes:"Not draining",cost:null }] },
  { id: 3, name: "Springs Ranch", state: "Colorado", city: "Colorado Springs", address: "8901 Mesa Dr, Colorado Springs, CO 80920", type: "Single Family", bedrooms: 3, bathrooms: 2, sqft: 2100, yearBuilt: 2015, purchasePrice: 340000, purchaseDate: "2019-09-10", valuations: { zillow: { value: 462000, change: 1.5, lastUpdated: "2026-02-01" }, redfin: { value: 455000, change: 1.2, lastUpdated: "2026-02-02" }, realtor: { value: 468000, change: 1.8, lastUpdated: "2026-01-30" } }, marketHistory: [{ month:"Aug",zillow:440000,redfin:435000,realtor:445000 },{ month:"Sep",zillow:445000,redfin:438000,realtor:450000 },{ month:"Oct",zillow:448000,redfin:442000,realtor:455000 },{ month:"Nov",zillow:452000,redfin:446000,realtor:458000 },{ month:"Dec",zillow:456000,redfin:450000,realtor:462000 },{ month:"Jan",zillow:459000,redfin:452000,realtor:465000 },{ month:"Feb",zillow:462000,redfin:455000,realtor:468000 }], expenses: [{ id:1,date:"2026-01-15",category:"Mortgage",amount:1650,description:"Monthly mortgage",recurring:true },{ id:2,date:"2026-01-20",category:"Insurance",amount:165,description:"Homeowners insurance",recurring:true },{ id:3,date:"2026-01-12",category:"Utilities",amount:240,description:"Electric + Gas + Water",recurring:true }], maintenance: [{ id:1,title:"Fence Repair",status:"pending",priority:"low",date:"2026-03-01",vendor:"TBD",notes:"Wind damage",cost:null }] },
  { id: 4, name: "Sugarhouse Bungalow", state: "Utah", city: "Salt Lake City", address: "1845 S 1100 E, Salt Lake City, UT 84105", type: "Single Family", bedrooms: 3, bathrooms: 2, sqft: 1800, yearBuilt: 1948, purchasePrice: 420000, purchaseDate: "2021-05-12", valuations: { zillow: { value: 548000, change: 2.5, lastUpdated: "2026-02-01" }, redfin: { value: 540000, change: 2.1, lastUpdated: "2026-02-02" }, realtor: { value: 555000, change: 2.8, lastUpdated: "2026-01-30" } }, marketHistory: [{ month:"Aug",zillow:520000,redfin:514000,realtor:525000 },{ month:"Sep",zillow:525000,redfin:518000,realtor:530000 },{ month:"Oct",zillow:530000,redfin:524000,realtor:536000 },{ month:"Nov",zillow:536000,redfin:530000,realtor:542000 },{ month:"Dec",zillow:542000,redfin:535000,realtor:548000 },{ month:"Jan",zillow:545000,redfin:538000,realtor:552000 },{ month:"Feb",zillow:548000,redfin:540000,realtor:555000 }], expenses: [{ id:1,date:"2026-01-15",category:"Mortgage",amount:2050,description:"Monthly mortgage",recurring:true },{ id:2,date:"2026-01-20",category:"Insurance",amount:140,description:"Homeowners insurance",recurring:true },{ id:3,date:"2026-01-08",category:"Utilities",amount:210,description:"Electric + Gas + Water",recurring:true },{ id:4,date:"2026-01-28",category:"Maintenance",amount:600,description:"Water heater replacement",recurring:false,invoice:"INV-2026-044" }], maintenance: [{ id:1,title:"Water Heater Replace",status:"completed",priority:"high",date:"2026-01-28",vendor:"Plumb Perfect SLC",notes:"40-gal tank",cost:600 },{ id:2,title:"Foundation Inspection",status:"scheduled",priority:"medium",date:"2026-03-15",vendor:"Wasatch Foundation",notes:"Older home check",cost:350 }] },
  { id: 5, name: "Daybreak Townhome", state: "Utah", city: "South Jordan", address: "4520 W Harvest Moon Ln, South Jordan, UT 84009", type: "Townhouse", bedrooms: 3, bathrooms: 2.5, sqft: 1650, yearBuilt: 2022, purchasePrice: 410000, purchaseDate: "2022-11-01", valuations: { zillow: { value: 438000, change: 1.8, lastUpdated: "2026-02-01" }, redfin: { value: 432000, change: 1.5, lastUpdated: "2026-02-02" }, realtor: { value: 442000, change: 2.0, lastUpdated: "2026-01-30" } }, marketHistory: [{ month:"Aug",zillow:418000,redfin:414000,realtor:422000 },{ month:"Sep",zillow:422000,redfin:418000,realtor:426000 },{ month:"Oct",zillow:425000,redfin:420000,realtor:430000 },{ month:"Nov",zillow:430000,redfin:425000,realtor:435000 },{ month:"Dec",zillow:434000,redfin:428000,realtor:438000 },{ month:"Jan",zillow:436000,redfin:430000,realtor:440000 },{ month:"Feb",zillow:438000,redfin:432000,realtor:442000 }], expenses: [{ id:1,date:"2026-01-15",category:"Mortgage",amount:2250,description:"Monthly mortgage",recurring:true },{ id:2,date:"2026-01-10",category:"HOA",amount:280,description:"Monthly HOA",recurring:true },{ id:3,date:"2026-01-20",category:"Insurance",amount:110,description:"Homeowners insurance",recurring:true }], maintenance: [] },
  { id: 6, name: "Red Rock Villa", state: "Utah", city: "St. George", address: "2200 Crimson Ridge Dr, St. George, UT 84790", type: "Single Family", bedrooms: 4, bathrooms: 3, sqft: 2400, yearBuilt: 2020, purchasePrice: 465000, purchaseDate: "2021-08-20", valuations: { zillow: { value: 518000, change: 1.2, lastUpdated: "2026-02-01" }, redfin: { value: 510000, change: 0.9, lastUpdated: "2026-02-02" }, realtor: { value: 525000, change: 1.5, lastUpdated: "2026-01-30" } }, marketHistory: [{ month:"Aug",zillow:498000,redfin:492000,realtor:505000 },{ month:"Sep",zillow:502000,redfin:496000,realtor:508000 },{ month:"Oct",zillow:505000,redfin:498000,realtor:512000 },{ month:"Nov",zillow:510000,redfin:502000,realtor:516000 },{ month:"Dec",zillow:514000,redfin:506000,realtor:520000 },{ month:"Jan",zillow:516000,redfin:508000,realtor:522000 },{ month:"Feb",zillow:518000,redfin:510000,realtor:525000 }], expenses: [{ id:1,date:"2026-01-15",category:"Mortgage",amount:2300,description:"Monthly mortgage",recurring:true },{ id:2,date:"2026-01-20",category:"Insurance",amount:155,description:"Homeowners insurance",recurring:true },{ id:3,date:"2026-01-12",category:"Utilities",amount:280,description:"Electric + Gas + Water",recurring:true },{ id:4,date:"2025-12-20",category:"Landscaping",amount:800,description:"Xeriscaping front yard",recurring:false,invoice:"INV-2025-112" }], maintenance: [{ id:1,title:"AC Compressor Check",status:"scheduled",priority:"high",date:"2026-03-01",vendor:"Desert Cool HVAC",notes:"Pre-summer",cost:200 }] },
];

const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const fmtD = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const avgVal = (p) => Math.round((p.valuations.zillow.value + p.valuations.redfin.value + p.valuations.realtor.value) / 3);

const I = {
  Home: () => <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 12l9-8 9 8M5 10v10a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V10"/></svg>,
  Chart: () => <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 5-6"/></svg>,
  Wrench: () => <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>,
  Receipt: () => <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z"/><path d="M8 10h8M8 14h4"/></svg>,
  Map: () => <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z"/><path d="M8 2v16M16 6v16"/></svg>,
  Plus: () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>,
  Upload: () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>,
  X: () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>,
  Check: () => <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>,
  Alert: () => <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>,
  Clock: () => <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
  Bldg: () => <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="20" rx="1"/><path d="M9 6h2M13 6h2M9 10h2M13 10h2M9 14h2M13 14h2M9 18h6"/></svg>,
  Back: () => <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,
  Eye: () => <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  Star: () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  Dollar: () => <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  Stock: () => <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  Shield: () => <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Bank: () => <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M8 10v11M12 10v11M16 10v11M20 10v11"/></svg>,
  Wallet: () => <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21 12V7H5a2 2 0 010-4h14v4"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12a1 1 0 100 2 1 1 0 000-2z"/></svg>,
  Link: () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>,
  Pie: () => <svg width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d="M21.21 15.89A10 10 0 118 2.83"/><path d="M22 12A10 10 0 0012 2v10z"/></svg>,
  TrendUp: () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M23 6l-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></svg>,
  TrendDown: () => <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M23 18l-9.5-9.5-5 5L1 6"/><path d="M17 18h6v-6"/></svg>,
};

const CAT_C = { Mortgage:"#6366f1",Insurance:"#f59e0b",Utilities:"#10b981",Maintenance:"#ef4444",Repairs:"#ec4899",Landscaping:"#8b5cf6",HOA:"#06b6d4",Other:"#6b7280" };
const ST_C = { completed:{c:"#10b981",bg:"#10b98118",l:"Done",I:I.Check},"in-progress":{c:"#f59e0b",bg:"#f59e0b18",l:"Active",I:I.Clock},scheduled:{c:"#6366f1",bg:"#6366f118",l:"Scheduled",I:I.Clock},pending:{c:"#ef4444",bg:"#ef444418",l:"Pending",I:I.Alert} };
const PR_C = { high:{c:"#ef4444",l:"High"},medium:{c:"#f59e0b",l:"Med"},low:{c:"#6b7280",l:"Low"} };
const INS_I = { trend:"\u{1F4CA}",positive:"\u2705",warning:"\u26A0\uFE0F",neutral:"\u2139\uFE0F" };

const MOCK_STOCKS = [
  { id: 1, ticker: "AAPL", name: "Apple Inc.", shares: 45, costBasis: 142.50, currentPrice: 198.36, sector: "Technology", brokerage: "Schwab" },
  { id: 2, ticker: "MSFT", name: "Microsoft Corp.", shares: 20, costBasis: 285.00, currentPrice: 415.80, sector: "Technology", brokerage: "Schwab" },
  { id: 3, ticker: "GOOGL", name: "Alphabet Inc.", shares: 15, costBasis: 120.00, currentPrice: 172.45, sector: "Technology", brokerage: "Schwab" },
  { id: 4, ticker: "AMZN", name: "Amazon.com Inc.", shares: 30, costBasis: 128.50, currentPrice: 192.30, sector: "Consumer", brokerage: "Fidelity" },
  { id: 5, ticker: "NVDA", name: "NVIDIA Corp.", shares: 25, costBasis: 480.00, currentPrice: 875.50, sector: "Technology", brokerage: "Fidelity" },
  { id: 6, ticker: "VOO", name: "Vanguard S&P 500 ETF", shares: 12, costBasis: 380.00, currentPrice: 495.20, sector: "Index Fund", brokerage: "Vanguard" },
  { id: 7, ticker: "VTI", name: "Vanguard Total Stock", shares: 18, costBasis: 205.00, currentPrice: 268.40, sector: "Index Fund", brokerage: "Vanguard" },
  { id: 8, ticker: "TSLA", name: "Tesla Inc.", shares: 10, costBasis: 245.00, currentPrice: 178.90, sector: "Consumer", brokerage: "Schwab" },
];

const MOCK_RETIREMENT = [
  { id: 1, name: "401(k) - Employer", type: "401k", provider: "Fidelity", balance: 128500, contributions: 95000, employerMatch: 22400, ytdContribution: 4200, ytdLimit: 23500, allocation: [{ label: "US Stocks", pct: 60, color: "#3b82f6" }, { label: "Int'l Stocks", pct: 20, color: "#10b981" }, { label: "Bonds", pct: 15, color: "#f59e0b" }, { label: "Cash", pct: 5, color: "#6b7280" }], history: [{ month: "Aug", value: 115000 }, { month: "Sep", value: 118000 }, { month: "Oct", value: 116500 }, { month: "Nov", value: 121000 }, { month: "Dec", value: 124000 }, { month: "Jan", value: 126800 }, { month: "Feb", value: 128500 }] },
  { id: 2, name: "Roth IRA", type: "roth_ira", provider: "Vanguard", balance: 47200, contributions: 36000, employerMatch: 0, ytdContribution: 2000, ytdLimit: 7000, allocation: [{ label: "Growth Stocks", pct: 70, color: "#8b5cf6" }, { label: "Index Funds", pct: 25, color: "#3b82f6" }, { label: "Bonds", pct: 5, color: "#f59e0b" }], history: [{ month: "Aug", value: 42000 }, { month: "Sep", value: 43200 }, { month: "Oct", value: 42800 }, { month: "Nov", value: 44500 }, { month: "Dec", value: 45600 }, { month: "Jan", value: 46400 }, { month: "Feb", value: 47200 }] },
  { id: 3, name: "Traditional IRA", type: "trad_ira", provider: "Schwab", balance: 22800, contributions: 18000, employerMatch: 0, ytdContribution: 0, ytdLimit: 7000, allocation: [{ label: "Target Date 2055", pct: 100, color: "#06b6d4" }], history: [{ month: "Aug", value: 20500 }, { month: "Sep", value: 21000 }, { month: "Oct", value: 20800 }, { month: "Nov", value: 21500 }, { month: "Dec", value: 22000 }, { month: "Jan", value: 22400 }, { month: "Feb", value: 22800 }] },
];

const MOCK_OTHER_ASSETS = [
  { id: 1, name: "High-Yield Savings", type: "savings", institution: "Marcus by Goldman Sachs", balance: 25000, apy: 4.5, color: "#10b981" },
  { id: 2, name: "Emergency Fund", type: "savings", institution: "Ally Bank", balance: 15000, apy: 4.25, color: "#3b82f6" },
  { id: 3, name: "Bitcoin", type: "crypto", institution: "Coinbase", balance: 12400, units: 0.128, costBasis: 8500, color: "#f97316" },
  { id: 4, name: "Ethereum", type: "crypto", institution: "Coinbase", balance: 4800, units: 1.35, costBasis: 3200, color: "#6366f1" },
  { id: 5, name: "12-Month CD", type: "cd", institution: "Capital One", balance: 10000, apy: 4.8, maturityDate: "2026-11-15", color: "#f59e0b" },
  { id: 6, name: "I-Bonds", type: "bonds", institution: "TreasuryDirect", balance: 20000, apy: 3.11, color: "#8b5cf6" },
];

const MOCK_LIABILITIES = [
  { id: 1, name: "LoDo Loft Mortgage", type: "mortgage", balance: 295000, rate: 5.25, monthlyPayment: 2850, originalBalance: 385000 },
  { id: 2, name: "Pearl St. Mortgage", type: "mortgage", balance: 520000, rate: 4.875, monthlyPayment: 3400, originalBalance: 650000 },
  { id: 3, name: "Springs Ranch Mortgage", type: "mortgage", balance: 265000, rate: 5.5, monthlyPayment: 1650, originalBalance: 306000 },
  { id: 4, name: "Sugarhouse Mortgage", type: "mortgage", balance: 335000, rate: 4.75, monthlyPayment: 2050, originalBalance: 378000 },
  { id: 5, name: "Daybreak Mortgage", type: "mortgage", balance: 355000, rate: 6.125, monthlyPayment: 2250, originalBalance: 390000 },
  { id: 6, name: "Red Rock Mortgage", type: "mortgage", balance: 380000, rate: 5.0, monthlyPayment: 2300, originalBalance: 418500 },
  { id: 7, name: "Auto Loan - Model Y", type: "auto", balance: 28500, rate: 4.5, monthlyPayment: 620, originalBalance: 42000 },
  { id: 8, name: "Student Loans", type: "student", balance: 18200, rate: 3.75, monthlyPayment: 350, originalBalance: 45000 },
];

const ACCT_COLORS = { "401k": "#3b82f6", roth_ira: "#8b5cf6", trad_ira: "#06b6d4", savings: "#10b981", crypto: "#f97316", cd: "#f59e0b", bonds: "#8b5cf6" };
const LIAB_COLORS = { mortgage: "#ef4444", auto: "#f59e0b", student: "#6366f1", credit: "#ec4899" };

function Spark({ data, keys, colors, height = 120 }) {
  if (!data?.length) return null;
  const all = data.flatMap((d) => keys.map((k) => d[k]));
  const mn = Math.min(...all)*.995, mx = Math.max(...all)*1.005;
  const w=100,h=height;
  const gy=(v)=>h-((v-mn)/(mx-mn))*(h-20)-10;
  const gx=(i)=>(i/(data.length-1))*(w-10)+5;
  return (<svg viewBox={"0 0 "+w+" "+h} style={{width:"100%",height}} preserveAspectRatio="none">{keys.map((key,ki)=>{const pts=data.map((d,i)=>gx(i)+","+gy(d[key])).join(" ");return(<g key={key}><polyline points={pts} fill="none" stroke={colors[ki]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>{data.map((d,i)=><circle key={i} cx={gx(i)} cy={gy(d[key])} r="1.8" fill={colors[ki]}/>)}</g>);})}{data.map((d,i)=><text key={i} x={gx(i)} y={h-1} textAnchor="middle" fontSize="4" fill="#8896ab">{d.month}</text>)}</svg>);
}
function Bars({data,vk,lk,color,height=130}){const mx=Math.max(...data.map((d)=>d[vk]));return(<div style={{display:"flex",alignItems:"flex-end",gap:5,height,padding:"0 2px"}}>{data.map((d,i)=>{const bh=(d[vk]/mx)*(height-22);return(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}><div style={{fontSize:8,color:"#8896ab",fontFamily:"'JetBrains Mono',monospace"}}>{(d[vk]/1000).toFixed(0)}k</div><div style={{width:"100%",height:bh,background:color+"30",borderRadius:"3px 3px 0 0",border:"1px solid "+color+"50",position:"relative",overflow:"hidden"}}><div style={{position:"absolute",bottom:0,left:0,right:0,height:"40%",background:"linear-gradient(to top,"+color+"60,transparent)"}}/></div><div style={{fontSize:8,color:"#8896ab",whiteSpace:"nowrap"}}>{d[lk]}</div></div>);})}</div>);}
function Donut({data,size=126}){const tot=data.reduce((s,d)=>s+d.value,0);const r=size/2-10,cx=size/2,cy=size/2;let cum=-90;return(<svg width={size} height={size}>{data.map((d,i)=>{const a=(d.value/tot)*360,s=cum;cum+=a;const sr=(s*Math.PI)/180,er=((s+a)*Math.PI)/180;return <path key={i} d={"M"+cx+","+cy+" L"+(cx+r*Math.cos(sr))+","+(cy+r*Math.sin(sr))+" A"+r+","+r+" 0 "+(a>180?1:0)+" 1 "+(cx+r*Math.cos(er))+","+(cy+r*Math.sin(er))+" Z"} fill={d.color} opacity="0.85"/>;})}<circle cx={cx} cy={cy} r={r*0.55} fill="#111827"/><text x={cx} y={cy-3} textAnchor="middle" fill="#e5e7eb" fontSize="12" fontWeight="700">{fmt(tot)}</text><text x={cx} y={cy+10} textAnchor="middle" fill="#6b7280" fontSize="7">total</text></svg>);}

function ProgressBar({ stages, currentStage }) {
  const idx = stages.findIndex((s) => s.id === currentStage);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, width: "100%" }}>
      {stages.map((s, i) => {
        const done = i < idx, active = i === idx, future = i > idx;
        return (
          <div key={s.id} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
              {i > 0 && <div style={{ flex: 1, height: 3, background: done || active ? s.color : "#374151", borderRadius: 2, transition: "background .3s" }} />}
              <div style={{ width: active ? 18 : 14, height: active ? 18 : 14, borderRadius: "50%", background: done ? stages[i].color : active ? s.color : "#374151", border: active ? "2px solid " + s.color : "2px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .3s", boxShadow: active ? "0 0 8px " + s.color + "60" : "none" }}>
                {done && <svg width="8" height="8" fill="none" stroke="#fff" strokeWidth="3" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>}
                {active && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
              </div>
              {i < stages.length - 1 && <div style={{ flex: 1, height: 3, background: done ? stages[i + 1].color : "#374151", borderRadius: 2, transition: "background .3s" }} />}
            </div>
            <div style={{ fontSize: 7, color: done || active ? "#e5e7eb" : "#6b7280", marginTop: 4, textAlign: "center", fontWeight: active ? 700 : 400, whiteSpace: "nowrap" }}>{s.label}</div>
          </div>
        );
      })}
    </div>
  );
}

function Modal({open,onClose,title,children}){if(!open)return null;return(<div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.65)",backdropFilter:"blur(6px)"}} onClick={onClose}><div onClick={(e)=>e.stopPropagation()} style={{background:"#1f2937",border:"1px solid #374151",borderRadius:16,padding:26,width:"90%",maxWidth:540,maxHeight:"85vh",overflow:"auto",animation:"fu .25s ease"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}><h3 style={{margin:0,fontSize:16,color:"#e5e7eb"}}>{title}</h3><button onClick={onClose} style={{background:"none",border:"none",color:"#6b7280",cursor:"pointer"}}><I.X/></button></div>{children}</div></div>);}
const Inp=({label,...p})=>(<div style={{marginBottom:12}}><label style={{display:"block",fontSize:11,color:"#9ca3af",marginBottom:3,fontWeight:500}}>{label}</label><input {...p} style={{width:"100%",padding:"8px 10px",background:"#111827",border:"1px solid #374151",borderRadius:7,color:"#e5e7eb",fontSize:13,outline:"none",boxSizing:"border-box"}}/></div>);
const Sel=({label,options,...p})=>(<div style={{marginBottom:12}}><label style={{display:"block",fontSize:11,color:"#9ca3af",marginBottom:3,fontWeight:500}}>{label}</label><select {...p} style={{width:"100%",padding:"8px 10px",background:"#111827",border:"1px solid #374151",borderRadius:7,color:"#e5e7eb",fontSize:13,outline:"none",boxSizing:"border-box"}}>{options.map((o)=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div>);
const Card=({children,style:s,...p})=><div style={{background:"#1f2937",border:"1px solid #2d3748",borderRadius:13,padding:18,...s}} {...p}>{children}</div>;
const Pill=({c,bg,ch})=><span style={{fontSize:10,padding:"2px 8px",borderRadius:5,background:bg||(c+"18"),color:c,fontWeight:600}}>{ch}</span>;

export default function App() {
  const { user, logout } = useAuth();
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const [properties, setProperties] = useState([]);
  const [prospects, setProspects] = useState([]);
  const [view, setView] = useState("portfolio");
  const [selState, setSelState] = useState(null);
  const [selPropId, setSelPropId] = useState(null);
  const [selProspectId, setSelProspectId] = useState(null);
  const [tab, setTab] = useState("overview");
  const [showExp, setShowExp] = useState(false);
  const [showMnt, setShowMnt] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showAddProspect, setShowAddProspect] = useState(false);
  const [files, setFiles] = useState([]);
  const fRef = useRef(null);

  // Top-level navigation: "realestate" or "wealth"
  const [topNav, setTopNav] = useState("realestate");
  // Wealth state
  const [stocks, setStocks] = useState([]);
  const [retirement, setRetirement] = useState([]);
  const [otherAssets, setOtherAssets] = useState([]);
  const [liabilities, setLiabilities] = useState([]);
  const [wealthView, setWealthView] = useState("overview");
  const [showAddStock, setShowAddStock] = useState(false);
  const [showAddRetirement, setShowAddRetirement] = useState(false);
  const [showAddOther, setShowAddOther] = useState(false);
  const [showAddLiability, setShowAddLiability] = useState(false);
  const [selRetId, setSelRetId] = useState(null);
  const [fetchingData, setFetchingData] = useState(false);
  const [fetchStatus, setFetchStatus] = useState("");

  // Fetch real property data from RentCast API
  const handleFetchProperty = async (formRef) => {
    const fd = new FormData(formRef);
    const addr = fd.get("addr");
    const city = fd.get("city");
    const st = fd.get("state") === "Colorado" ? "CO" : fd.get("state") === "Utah" ? "UT" : fd.get("state");
    const zip = fd.get("zip");
    if (!addr || !city || !zip) { setFetchStatus("Enter address, city, and zip code first"); return; }
    setFetchingData(true);
    setFetchStatus("Fetching real market data...");
    try {
      const data = await fetchFullPropertyAnalysis(addr, city, st, zip, fd.get("bd") || undefined);
      // Auto-fill form fields from property record
      if (data.property) {
        const p = data.property;
        if (p.bedrooms) formRef.querySelector('[name="bd"]').value = p.bedrooms;
        if (p.bathrooms) formRef.querySelector('[name="ba"]').value = p.bathrooms;
        if (p.squareFootage) formRef.querySelector('[name="sqft"]').value = p.squareFootage;
        if (p.yearBuilt) formRef.querySelector('[name="yr"]').value = p.yearBuilt;
        if (p.propertyType) {
          const sel = formRef.querySelector('[name="type"]');
          const typeMap = { "Single Family": "Single Family", "Condo": "Condo", "Townhouse": "Townhouse", "Multi-Family": "Multi-Family" };
          if (typeMap[p.propertyType]) sel.value = typeMap[p.propertyType];
        }
      }
      // Store fetched data for use on submit
      formRef._apiData = data;
      const valEst = data.valuation?.price || data.valuation?.priceRangeLow || null;
      const rentEst = data.rent?.rent || null;
      let msg = "Data loaded!";
      if (valEst) msg += " Est. value: " + fmt(valEst);
      if (rentEst) msg += " | Rent: " + fmt(rentEst) + "/mo";
      if (data.errors?.length) msg += " (" + data.errors.length + " partial errors)";
      setFetchStatus(msg);
    } catch (e) {
      setFetchStatus("Error: " + e.message);
    }
    setFetchingData(false);
  };

  // ═══════════════ LOAD DATA FROM FIRESTORE ═══════════════
  useEffect(() => {
    if (!user) return;
    async function load() {
      const data = await loadUserData(user.uid);
      if (data) {
        // User has saved data — load it
        if (data.properties?.length) setProperties(data.properties);
        else setProperties(MOCK_PROPERTIES); // First time: use sample data
        if (data.prospects?.length) setProspects(data.prospects);
        else setProspects(INIT_PROSPECTS);
        if (data.stocks?.length) setStocks(data.stocks);
        else setStocks(MOCK_STOCKS);
        if (data.retirement?.length) setRetirement(data.retirement);
        else setRetirement(MOCK_RETIREMENT);
        if (data.otherAssets?.length) setOtherAssets(data.otherAssets);
        else setOtherAssets(MOCK_OTHER_ASSETS);
        if (data.liabilities?.length) setLiabilities(data.liabilities);
        else setLiabilities(MOCK_LIABILITIES);
      } else {
        // Brand new user — load sample data
        setProperties(MOCK_PROPERTIES);
        setProspects(INIT_PROSPECTS);
        setStocks(MOCK_STOCKS);
        setRetirement(MOCK_RETIREMENT);
        setOtherAssets(MOCK_OTHER_ASSETS);
        setLiabilities(MOCK_LIABILITIES);
      }
      setDataLoaded(true);
    }
    load();
  }, [user]);

  // ═══════════════ AUTO-SAVE TO FIRESTORE ═══════════════
  const saveTimer = useRef(null);
  const doSave = useCallback(() => {
    if (!user || !dataLoaded) return;
    saveUserData(user.uid, { properties, prospects, stocks, retirement, otherAssets, liabilities });
  }, [user, dataLoaded, properties, prospects, stocks, retirement, otherAssets, liabilities]);

  useEffect(() => {
    if (!dataLoaded) return;
    // Debounce: save 2 seconds after last change
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(doSave, 2000);
    return () => clearTimeout(saveTimer.current);
  }, [doSave, dataLoaded]);

  // Show loading while data loads
  if (!dataLoaded) {
    return (
      <div style={{ minHeight:"100vh",background:"#111827",display:"flex",alignItems:"center",justifyContent:"center",color:"#6b7280",fontSize:14,fontFamily:"'Outfit',sans-serif" }}>
        <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
        <div style={{animation:"pulse 1.5s ease infinite"}}>Loading your dashboard...</div>
      </div>
    );
  }

  const states = [...new Set([...properties.map((p) => p.state), ...prospects.map((p) => p.state)])].filter((s) => STATE_MARKET_DATA[s]);
  const groups = {}; states.forEach((s) => { groups[s] = properties.filter((p) => p.state === s); });
  const prospectGroups = {}; states.forEach((s) => { prospectGroups[s] = prospects.filter((p) => p.state === s && p.stage !== "closed"); });
  const prop = properties.find((p) => p.id === selPropId);
  const prospect = prospects.find((p) => p.id === selProspectId);
  const sm = selState ? STATE_MARKET_DATA[selState] : null;
  const totVal = properties.reduce((s, p) => s + avgVal(p), 0);
  const totEq = properties.reduce((s, p) => s + (avgVal(p) - p.purchasePrice), 0);

  // Wealth calculations
  const stocksValue = stocks.reduce((s, st) => s + st.shares * st.currentPrice, 0);
  const stocksCostBasis = stocks.reduce((s, st) => s + st.shares * st.costBasis, 0);
  const stocksGain = stocksValue - stocksCostBasis;
  const retirementValue = retirement.reduce((s, r) => s + r.balance, 0);
  const otherAssetsValue = otherAssets.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + l.balance, 0);
  const totalAssets = totVal + stocksValue + retirementValue + otherAssetsValue;
  const netWorth = totalAssets - totalLiabilities;

  const selRet = retirement.find((r) => r.id === selRetId);

  const openSt = (st) => { setSelState(st); setView("state"); };
  const openPr = (id) => { setSelPropId(id); setTab("overview"); setView("property"); };
  const openProspect = (id) => { setSelProspectId(id); setView("prospect"); };
  const goBack = () => { 
    if (topNav === "wealth") {
      if (wealthView !== "overview") { setWealthView("overview"); setSelRetId(null); }
      else { setTopNav("realestate"); setView("portfolio"); }
    } else {
      if (view === "property" || view === "prospect") setView("state"); else { setView("portfolio"); setSelState(null); }
    }
  };

  const updateProspectStage = (id, newStage) => {
    if (newStage === "closed") {
      const pr = prospects.find((p) => p.id === id);
      if (pr) {
        const newProp = { id: Date.now(), name: pr.name, state: pr.state, city: pr.city, address: pr.address, type: pr.type, bedrooms: pr.bedrooms, bathrooms: pr.bathrooms, sqft: pr.sqft, yearBuilt: pr.yearBuilt, purchasePrice: pr.listPrice, purchaseDate: new Date().toISOString().split("T")[0], valuations: { zillow: { value: pr.zillowEst, change: 0, lastUpdated: "2026-02-09" }, redfin: { value: pr.redfinEst, change: 0, lastUpdated: "2026-02-09" }, realtor: { value: pr.realtorEst, change: 0, lastUpdated: "2026-02-09" } }, marketHistory: [{ month: "Feb", zillow: pr.zillowEst, redfin: pr.redfinEst, realtor: pr.realtorEst }], expenses: [], maintenance: [] };
        setProperties((prev) => [...prev, newProp]);
        setProspects((prev) => prev.filter((p) => p.id !== id));
        setView("state");
      }
    } else {
      setProspects((prev) => prev.map((p) => p.id === id ? { ...p, stage: newStage } : p));
    }
  };

  const bp = { background: "linear-gradient(135deg,#3b82f6,#2563eb)", color: "#fff", border: "none", borderRadius: 9, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4 };

  return (
    <div style={{ minHeight: "100vh", background: "#111827", color: "#e5e7eb", fontFamily: "'Outfit','Segoe UI',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
        @keyframes fu{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box;scrollbar-width:thin;scrollbar-color:#374151 transparent;-webkit-tap-highlight-color:transparent}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#374151;border-radius:3px}
        input[type="file"]{display:none}
        html,body{overflow-x:hidden;-webkit-overflow-scrolling:touch}
        .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
        .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
        .g6{display:grid;grid-template-columns:repeat(6,1fr);gap:12px}
        .g5{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
        .g2e{display:grid;grid-template-columns:2fr 1fr;gap:12px}
        .g1-230{display:grid;grid-template-columns:1fr 230px;gap:12px}
        .hscroll{overflow-x:auto;-webkit-overflow-scrolling:touch;scroll-snap-type:x mandatory;padding-bottom:4px}
        .hscroll>*{scroll-snap-align:start;min-width:160px}
        .header-stats{display:flex;gap:14px}
        .header-right{display:flex;gap:12px;align-items:center}
        .main-pad{max-width:1160px;margin:0 auto;padding:22px}
        .banner-flex{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;position:relative}
        .banner-title{margin:0;font-size:24px;font-weight:800;letter-spacing:-.03em}
        .prospect-header{display:flex;justify-content:space-between;align-items:flex-start}
        .prospect-vals{display:flex;gap:8px;align-items:center}
        .modal-inner{width:90%;max-width:540px}
        .gf2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .gf3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
        .prog-bar{display:flex;align-items:center;gap:0;position:relative;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px}
        .prog-step{display:flex;align-items:center;gap:6px;white-space:nowrap}
        .tbl-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
        .prop-tabs{display:flex;gap:3px;margin-bottom:20px;background:#1f2937;border-radius:11px;padding:3px;width:fit-content;overflow-x:auto;-webkit-overflow-scrolling:touch}
        @media(max-width:768px){
          .g4{grid-template-columns:repeat(2,1fr)}
          .g3{grid-template-columns:1fr}
          .g2{grid-template-columns:1fr}
          .g6{grid-template-columns:repeat(3,1fr)}
          .g5{grid-template-columns:repeat(2,1fr)}
          .g2e{grid-template-columns:1fr}
          .g1-230{grid-template-columns:1fr}
          .header-stats{display:none}
          .header-right{gap:6px}
          .main-pad{padding:14px}
          .banner-flex{flex-direction:column;gap:12px}
          .banner-title{font-size:18px}
          .prospect-header{flex-direction:column;gap:8px}
          .prospect-vals{flex-direction:column;align-items:flex-start;gap:4px}
          .gf2{grid-template-columns:1fr}
          .gf3{grid-template-columns:1fr 1fr}
          .prop-tabs{width:100%;overflow-x:auto}
          .modal-inner{width:95%;max-width:none;padding:18px}
        }
        @media(max-width:480px){
          .g6{grid-template-columns:repeat(2,1fr)}
          .g5{grid-template-columns:1fr 1fr}
          .g4{grid-template-columns:1fr 1fr}
        }
      `}</style>

      <header style={{ padding:"12px 16px",borderBottom:"1px solid #1f2937",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(17,24,39,.88)",backdropFilter:"blur(12px)",position:"sticky",top:0,zIndex:100 }}>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          {(topNav==="wealth"?(wealthView!=="overview"):view !== "portfolio") && <button onClick={goBack} style={{ background:"#1f2937",border:"1px solid #374151",borderRadius:7,padding:"5px 7px",cursor:"pointer",color:"#9ca3af",display:"flex" }}><I.Back/></button>}
          <div style={{ width:32,height:32,borderRadius:9,background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff" }}>{topNav==="wealth"?<I.Dollar/>:<I.Home/>}</div>
          <div><h1 style={{ margin:0,fontSize:16,fontWeight:700,letterSpacing:"-.02em" }}>PropTrack</h1><span style={{ fontSize:9,color:"#6b7280",fontFamily:"'JetBrains Mono',monospace",letterSpacing:".06em" }}>{topNav==="wealth"?(wealthView==="overview"?"NET WORTH DASHBOARD":wealthView==="retirement"&&selRet?selRet.name.toUpperCase():wealthView.toUpperCase()):(view==="portfolio"?"PORTFOLIO":view==="state"?(selState||"").toUpperCase()+" DASHBOARD":view==="prospect"?"PROSPECT DETAIL":(prop?.name||"").toUpperCase())}</span></div>
        </div>
        <div className="header-right">
          {/* Top-level toggle */}
          <div style={{display:"flex",background:"#1f2937",borderRadius:9,padding:2,border:"1px solid #374151"}}>
            <button onClick={()=>{setTopNav("realestate");setView("portfolio");setSelState(null);}} style={{padding:"5px 12px",borderRadius:7,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,background:topNav==="realestate"?"linear-gradient(135deg,#3b82f6,#2563eb)":"transparent",color:topNav==="realestate"?"#fff":"#6b7280",transition:"all .2s",display:"flex",alignItems:"center",gap:4}}><I.Home/> Property</button>
            <button onClick={()=>{setTopNav("wealth");setWealthView("overview");}} style={{padding:"5px 12px",borderRadius:7,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,background:topNav==="wealth"?"linear-gradient(135deg,#10b981,#059669)":"transparent",color:topNav==="wealth"?"#fff":"#6b7280",transition:"all .2s",display:"flex",alignItems:"center",gap:4}}><I.Dollar/> Wealth</button>
          </div>
          {topNav==="realestate" && <div style={{ display:"flex",gap:4 }}>
            {states.map((st)=>{const md=STATE_MARKET_DATA[st];return(<button key={st} onClick={()=>openSt(st)} style={{background:selState===st&&view!=="portfolio"?md.color+"20":"#1f2937",border:"1px solid "+(selState===st&&view!=="portfolio"?md.color:"#374151"),borderRadius:7,padding:"4px 10px",cursor:"pointer",color:selState===st&&view!=="portfolio"?md.color:"#9ca3af",fontSize:11,fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{md.abbr}</button>);})}
            <button onClick={()=>{setView("portfolio");setSelState(null);}} style={{background:view==="portfolio"?"#3b82f620":"#1f2937",border:"1px solid "+(view==="portfolio"?"#3b82f6":"#374151"),borderRadius:7,padding:"4px 10px",cursor:"pointer",color:view==="portfolio"?"#3b82f6":"#9ca3af",fontSize:11,fontWeight:600}}>All</button>
          </div>}
          <div className="header-stats" style={{background:"#1f2937",border:"1px solid #374151",borderRadius:9,padding:"5px 14px"}}>
            <div><div style={{fontSize:8,color:"#6b7280",fontFamily:"'JetBrains Mono',monospace"}}>NET WORTH</div><div style={{fontSize:14,fontWeight:700,color:"#10b981"}}>{fmt(netWorth)}</div></div>
            <div style={{width:1,background:"#374151"}}/>
            <div><div style={{fontSize:8,color:"#6b7280",fontFamily:"'JetBrains Mono',monospace"}}>ASSETS</div><div style={{fontSize:14,fontWeight:700,color:"#3b82f6"}}>{fmt(totalAssets)}</div></div>
          </div>
          {/* User Menu */}
          <div style={{position:"relative"}}>
            <button onClick={()=>setShowUserMenu(!showUserMenu)} style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(135deg,#3b82f6,#8b5cf6)",border:"2px solid #374151",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,fontWeight:700,padding:0}}>
              {(user?.displayName||user?.email||"U").charAt(0).toUpperCase()}
            </button>
            {showUserMenu && (<div style={{position:"absolute",top:42,right:0,background:"#1f2937",border:"1px solid #374151",borderRadius:12,padding:8,minWidth:200,zIndex:200,boxShadow:"0 8px 32px rgba(0,0,0,.5)",animation:"fu .2s ease"}} onClick={(e)=>e.stopPropagation()}>
              <div style={{padding:"10px 12px",borderBottom:"1px solid #2d3748",marginBottom:4}}>
                <div style={{fontSize:13,fontWeight:600,color:"#e5e7eb"}}>{user?.displayName||"User"}</div>
                <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>{user?.email}</div>
              </div>
              <button onClick={()=>{doSave();setShowUserMenu(false);}} style={{width:"100%",padding:"8px 12px",background:"none",border:"none",borderRadius:8,cursor:"pointer",color:"#9ca3af",fontSize:12,textAlign:"left",display:"flex",alignItems:"center",gap:8,transition:"background .15s"}} onMouseEnter={(e)=>e.currentTarget.style.background="#111827"} onMouseLeave={(e)=>e.currentTarget.style.background="none"}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
                Save Now
              </button>
              <button onClick={async()=>{await logout();setShowUserMenu(false);}} style={{width:"100%",padding:"8px 12px",background:"none",border:"none",borderRadius:8,cursor:"pointer",color:"#ef4444",fontSize:12,textAlign:"left",display:"flex",alignItems:"center",gap:8,transition:"background .15s"}} onMouseEnter={(e)=>e.currentTarget.style.background="#111827"} onMouseLeave={(e)=>e.currentTarget.style.background="none"}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                Sign Out
              </button>
            </div>)}
          </div>
        </div>
      </header>

      <main className="main-pad">

        {/* PORTFOLIO VIEW */}
        {topNav==="realestate" && view === "portfolio" && (<div style={{animation:"fu .35s ease"}}>
          <div className="g4" style={{marginBottom:24}}>
            {[{l:"PORTFOLIO VALUE",v:fmt(totVal),c:"#3b82f6"},{l:"TOTAL EQUITY",v:"+"+fmt(totEq),c:"#10b981"},{l:"PROPERTIES",v:properties.length,c:"#f59e0b"},{l:"PROSPECTS",v:prospects.length,c:"#8b5cf6"}].map((c,i)=>(<Card key={i} style={{animation:"fu .3s ease "+(i*.06)+"s both"}}><div style={{fontSize:9,color:"#6b7280",fontFamily:"'JetBrains Mono',monospace",letterSpacing:".06em",marginBottom:6}}>{c.l}</div><div style={{fontSize:22,fontWeight:700,color:c.c,letterSpacing:"-.02em"}}>{c.v}</div></Card>))}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><h2 style={{margin:0,fontSize:17,fontWeight:700}}>Your States</h2><button onClick={()=>setShowAdd(true)} style={bp}><I.Plus/> Add Property</button></div>
          <div className="g2">
            {states.map((state)=>{const md=STATE_MARKET_DATA[state];const ps=groups[state]||[];const prs=prospectGroups[state]||[];const sv=ps.reduce((s,p)=>s+avgVal(p),0);const se=ps.reduce((s,p)=>s+(avgVal(p)-p.purchasePrice),0);return(
              <div key={state} onClick={()=>openSt(state)} style={{cursor:"pointer",background:"linear-gradient(135deg,"+md.color+"08,#1f2937 40%)",border:"1px solid "+md.color+"30",borderRadius:14,padding:22,transition:"all .2s",position:"relative",overflow:"hidden"}} onMouseEnter={(e)=>{e.currentTarget.style.borderColor=md.color;e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={(e)=>{e.currentTarget.style.borderColor=md.color+"30";e.currentTarget.style.transform="none";}}>
                <div style={{position:"absolute",top:12,right:16,fontSize:44,fontWeight:800,color:md.color+"10",fontFamily:"'JetBrains Mono',monospace"}}>{md.abbr}</div>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}><div style={{width:38,height:38,borderRadius:9,background:md.gradient,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}><I.Map/></div><div><div style={{fontSize:17,fontWeight:700}}>{state}</div><div style={{fontSize:11,color:"#6b7280"}}>{ps.length} owned &middot; {prs.length} prospects &middot; {md.marketType}</div></div></div>
                <div style={{marginBottom:14}} className="gf3">
                  <div><div style={{fontSize:8,color:"#6b7280",fontFamily:"'JetBrains Mono',monospace"}}>YOUR VALUE</div><div style={{fontSize:15,fontWeight:700,color:md.color}}>{fmt(sv)}</div></div>
                  <div><div style={{fontSize:8,color:"#6b7280",fontFamily:"'JetBrains Mono',monospace"}}>EQUITY</div><div style={{fontSize:15,fontWeight:700,color:"#10b981"}}>+{fmt(se)}</div></div>
                  <div><div style={{fontSize:8,color:"#6b7280",fontFamily:"'JetBrains Mono',monospace"}}>STATE MEDIAN</div><div style={{fontSize:15,fontWeight:700}}>{fmt(md.medianPrice)}</div></div>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{ps.map((p)=><span key={p.id} style={{fontSize:10,color:"#9ca3af",background:"#111827",padding:"3px 8px",borderRadius:5,border:"1px solid #374151"}}>{p.name}</span>)}</div>
              </div>);})}
          </div>
        </div>)}

        {/* STATE DASHBOARD */}
        {topNav==="realestate" && view === "state" && sm && (()=>{
          const ps=groups[selState]||[];const prs=prospectGroups[selState]||[];
          const sv=ps.reduce((s,p)=>s+avgVal(p),0);const se=ps.reduce((s,p)=>s+(avgVal(p)-p.purchasePrice),0);
          const totalSqft=ps.reduce((s,p)=>s+p.sqft,0);const totalMaintOpen=ps.reduce((s,p)=>s+p.maintenance.filter((m)=>m.status!=="completed").length,0);
          const totalMonthlyExp=ps.reduce((s,p)=>s+p.expenses.filter((e)=>e.date.startsWith("2026-01")).reduce((a,e)=>a+e.amount,0),0);
          const avgApp=ps.length>0?ps.reduce((s,p)=>s+((avgVal(p)-p.purchasePrice)/p.purchasePrice)*100,0)/ps.length:0;
          const cities=[...new Set(ps.map((p)=>p.city))];const types=[...new Set(ps.map((p)=>p.type))];
          const totalProspectValue=prs.reduce((s,p)=>s+p.listPrice,0);
          return(<div style={{animation:"fu .35s ease"}}>
            {/* PORTFOLIO BANNER */}
            <div style={{background:"linear-gradient(135deg,"+sm.color+"14,#111827 50%,"+sm.color+"06)",border:"1px solid "+sm.color+"30",borderRadius:16,padding:26,marginBottom:22,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",top:-20,right:-10,fontSize:120,fontWeight:900,color:sm.color+"06",fontFamily:"'JetBrains Mono',monospace",lineHeight:1,pointerEvents:"none"}}>{sm.abbr}</div>
              <div style={{}} className="banner-flex">
                <div><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><div style={{width:42,height:42,borderRadius:11,background:sm.gradient,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}><I.Home/></div><div><h2 style={{margin:0,fontSize:24,fontWeight:800,letterSpacing:"-.03em"}}>Your {selState} Portfolio</h2><p style={{margin:"2px 0 0",fontSize:12,color:"#6b7280"}}>{ps.length} {ps.length===1?"property":"properties"} across {cities.length} {cities.length===1?"city":"cities"} &middot; {types.join(", ")}</p></div></div></div>
                <button onClick={()=>setShowAdd(true)} style={bp}><I.Plus/> Add Property</button>
              </div>
              <div style={{}} className="g6">
                {[{l:"TOTAL VALUE",v:fmt(sv),c:sm.color},{l:"TOTAL EQUITY",v:"+"+fmt(se),c:"#10b981"},{l:"AVG RETURN",v:avgApp.toFixed(1)+"%",c:"#8b5cf6"},{l:"MONTHLY EXP",v:fmt(totalMonthlyExp),c:"#f59e0b"},{l:"TOTAL SQ FT",v:totalSqft.toLocaleString(),c:"#3b82f6"},{l:"OPEN MAINT",v:totalMaintOpen,c:totalMaintOpen>0?"#ef4444":"#10b981"}].map((c,i)=>(<div key={i} style={{background:"#111827",border:"1px solid #2d3748",borderRadius:10,padding:"12px 14px",animation:"fu .3s ease "+(i*.04)+"s both"}}><div style={{fontSize:8,color:"#6b7280",fontFamily:"'JetBrains Mono',monospace",letterSpacing:".06em",marginBottom:5}}>{c.l}</div><div style={{fontSize:18,fontWeight:700,color:c.c,letterSpacing:"-.01em"}}>{c.v}</div></div>))}
              </div>
            </div>
            {/* YOUR PROPERTIES */}
            <h3 style={{margin:"0 0 12px",fontSize:15,fontWeight:700}}>Your {selState} Properties</h3>
            <div style={{marginBottom:28}} className="g3">
              {ps.map((p,i)=>{const v=avgVal(p),eq=v-p.purchasePrice;const pMo=p.expenses.filter((e)=>e.date.startsWith("2026-01")).reduce((a,e)=>a+e.amount,0);const pMt=p.maintenance.filter((m)=>m.status!=="completed").length;return(
                <Card key={p.id} style={{cursor:"pointer",transition:"all .2s",animation:"fu .3s ease "+(i*.06)+"s both",borderColor:sm.color+"20"}} onClick={()=>openPr(p.id)} onMouseEnter={(e)=>{e.currentTarget.style.borderColor=sm.color;e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={(e)=>{e.currentTarget.style.borderColor=sm.color+"20";e.currentTarget.style.transform="none";}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}><div style={{width:32,height:32,borderRadius:7,background:sm.color+"20",display:"flex",alignItems:"center",justifyContent:"center",color:sm.color}}><I.Bldg/></div><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:600}}>{p.name}</div><div style={{fontSize:10,color:"#6b7280"}}>{p.city} &middot; {p.type} &middot; {p.bedrooms}bd/{p.bathrooms}ba</div></div>{pMt>0&&<div style={{width:22,height:22,borderRadius:6,background:"#ef444418",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#ef4444",flexShrink:0}}>{pMt}</div>}</div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <div><div style={{fontSize:8,color:"#6b7280",fontFamily:"'JetBrains Mono',monospace"}}>VALUE</div><div style={{fontSize:16,fontWeight:700,color:sm.color}}>{fmt(v)}</div></div>
                    <div style={{textAlign:"center"}}><div style={{fontSize:8,color:"#6b7280",fontFamily:"'JetBrains Mono',monospace"}}>EQUITY</div><div style={{fontSize:16,fontWeight:700,color:"#10b981"}}>+{fmt(eq)}</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:8,color:"#6b7280",fontFamily:"'JetBrains Mono',monospace"}}>MONTHLY</div><div style={{fontSize:16,fontWeight:700,color:"#f59e0b"}}>{fmt(pMo)}</div></div>
                  </div>
                  <Spark data={p.marketHistory} keys={["zillow","redfin","realtor"]} colors={["#3b82f6","#ef4444","#10b981"]} height={55}/>
                </Card>);})}
            </div>
            {/* STATE MARKET OVERVIEW */}
            <div style={{borderTop:"1px solid #2d3748",paddingTop:24,marginBottom:22}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:18}}><div style={{width:36,height:36,borderRadius:9,background:sm.gradient,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}><I.Chart/></div><div><h2 style={{margin:0,fontSize:20,fontWeight:700}}>{selState} Market Overview</h2><p style={{margin:"2px 0 0",fontSize:12,color:"#6b7280"}}>{sm.marketType} &middot; Pop. {sm.population} &middot; Rates ~{sm.mortgageRate}% &middot; Jobs: {sm.jobGrowth}</p></div></div></div>
            <div style={{marginBottom:22}} className="g5">
              {[{l:"Median Price",v:fmt(sm.medianPrice),s:(sm.medianPriceChange>0?"+":"")+sm.medianPriceChange+"% YoY",sc:sm.medianPriceChange>=0?"#10b981":"#ef4444"},{l:"Days on Market",v:sm.avgDaysOnMarket,s:"+"+sm.domChange+"% YoY",sc:"#f59e0b"},{l:"Active Listings",v:sm.inventory.toLocaleString(),s:"+"+sm.inventoryChange+"% YoY",sc:"#3b82f6"},{l:"2026 Forecast",v:"+"+sm.forecastGrowth+"%",s:"Expected growth",sc:"#10b981"},{l:"List-to-Sale",v:sm.listToSaleRatio+"%",s:"Close to asking",sc:"#8b5cf6"}].map((c,i)=>(<Card key={i} style={{animation:"fu .3s ease "+(i*.05)+"s both"}}><div style={{fontSize:8,color:"#6b7280",fontFamily:"'JetBrains Mono',monospace",letterSpacing:".06em",marginBottom:5}}>{c.l.toUpperCase()}</div><div style={{fontSize:18,fontWeight:700}}>{c.v}</div><div style={{fontSize:10,color:c.sc,marginTop:2}}>{c.s}</div></Card>))}
            </div>
            <div style={{marginBottom:22}} className="g2">
              <Card><h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:600}}>Median Price Trend</h3><Spark data={sm.monthlyTrend} keys={["median"]} colors={[sm.color]} height={130}/></Card>
              <Card><h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:600}}>Top Cities</h3><Bars data={sm.topCities} vk="median" lk="name" color={sm.color}/></Card>
            </div>
            <Card style={{marginBottom:22}}><h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:600}}>2026 Market Insights</h3><div style={{gap:8}} className="g2">{sm.insights.map((ins,i)=>(<div key={i} style={{display:"flex",gap:8,padding:"9px 12px",background:"#111827",borderRadius:9,border:"1px solid #2d3748",fontSize:12,color:"#d1d5db",animation:"fu .3s ease "+(i*.04)+"s both"}}><span style={{flexShrink:0}}>{INS_I[ins.type]}</span><span>{ins.text}</span></div>))}</div></Card>
            <Card style={{marginBottom:22,padding:0,overflow:"hidden"}}><div style={{padding:"14px 18px 0"}}><h3 style={{margin:0,fontSize:14,fontWeight:600}}>City Comparison</h3></div><table style={{width:"100%",display:"block",overflowX:"auto",WebkitOverflowScrolling:"touch",borderCollapse:"collapse",fontSize:12,marginTop:10}}><thead><tr style={{background:"#111827"}}>{["City","Median Price","YoY Change","Avg DOM"].map((h)=><th key={h} style={{padding:"8px 14px",textAlign:"left",fontSize:9,fontFamily:"'JetBrains Mono',monospace",color:"#6b7280",fontWeight:600}}>{h.toUpperCase()}</th>)}</tr></thead><tbody>{sm.topCities.map((c,i)=>(<tr key={i} style={{borderTop:"1px solid #2d3748"}}><td style={{padding:"8px 14px",fontWeight:600}}>{c.name}</td><td style={{padding:"8px 14px",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(c.median)}</td><td style={{padding:"8px 14px",color:c.change>=0?"#10b981":"#ef4444",fontFamily:"'JetBrains Mono',monospace"}}>{c.change>0?"+":""}{c.change}%</td><td style={{padding:"8px 14px",fontFamily:"'JetBrains Mono',monospace"}}>{c.dom}d</td></tr>))}</tbody></table></Card>

            {/* PROSPECT PIPELINE */}
            <div style={{borderTop:"1px solid #2d3748",paddingTop:24,marginBottom:22}}>
              <div style={{marginBottom:16}} className="prospect-header">
                <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:36,height:36,borderRadius:9,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff"}}><I.Eye/></div><div><h2 style={{margin:0,fontSize:20,fontWeight:700}}>Properties You're Watching</h2><p style={{margin:"2px 0 0",fontSize:12,color:"#6b7280"}}>{prs.length} prospects in {selState} &middot; {fmt(totalProspectValue)} total list value</p></div></div>
                <button onClick={()=>setShowAddProspect(true)} style={{...bp,background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}><I.Plus/> Add Prospect</button>
              </div>
              {prs.length===0?<Card style={{textAlign:"center",padding:36,color:"#6b7280"}}>No prospects in {selState} yet. Add properties you're interested in buying.</Card>:(
                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {prs.map((pr,i)=>{const stg=PIPELINE_STAGES.find((s)=>s.id===pr.stage);const avgEst=Math.round((pr.zillowEst+pr.redfinEst+pr.realtorEst)/3);const diff=avgEst-pr.listPrice;return(
                    <Card key={pr.id} style={{cursor:"pointer",transition:"all .2s",animation:"fu .3s ease "+(i*.06)+"s both",borderColor:"#6366f130"}} onClick={()=>openProspect(pr.id)} onMouseEnter={(e)=>{e.currentTarget.style.borderColor="#6366f1";e.currentTarget.style.transform="translateY(-1px)";}} onMouseLeave={(e)=>{e.currentTarget.style.borderColor="#6366f130";e.currentTarget.style.transform="none";}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                        <div style={{display:"flex",gap:10,alignItems:"center"}}>
                          <div style={{width:36,height:36,borderRadius:8,background:"#6366f120",display:"flex",alignItems:"center",justifyContent:"center",color:"#6366f1"}}><I.Star/></div>
                          <div><div style={{fontSize:14,fontWeight:600}}>{pr.name}</div><div style={{fontSize:11,color:"#6b7280"}}>{pr.city} &middot; {pr.type} &middot; {pr.bedrooms}bd/{pr.bathrooms}ba &middot; {pr.sqft.toLocaleString()} sqft</div></div>
                        </div>
                        <div style={{}} className="prospect-vals">
                          <div style={{textAlign:"right"}}><div style={{fontSize:8,color:"#6b7280",fontFamily:"'JetBrains Mono',monospace"}}>LIST PRICE</div><div style={{fontSize:18,fontWeight:700,color:"#e5e7eb"}}>{fmt(pr.listPrice)}</div></div>
                          <div style={{textAlign:"right"}}><div style={{fontSize:8,color:"#6b7280",fontFamily:"'JetBrains Mono',monospace"}}>AVG ESTIMATE</div><div style={{fontSize:18,fontWeight:700,color:diff>=0?"#10b981":"#ef4444"}}>{fmt(avgEst)}</div></div>
                        </div>
                      </div>
                      <div style={{marginBottom:10}}><ProgressBar stages={PIPELINE_STAGES} currentStage={pr.stage}/></div>
                      {pr.notes&&<div style={{fontSize:12,color:"#9ca3af",background:"#111827",padding:"8px 12px",borderRadius:8,marginTop:4}}>{pr.notes}</div>}
                    </Card>);})}
                </div>
              )}
            </div>
          </div>);
        })()}

        {/* PROSPECT DETAIL VIEW */}
        {topNav==="realestate" && view === "prospect" && prospect && (()=>{
          const pr=prospect;const stg=PIPELINE_STAGES.find((s)=>s.id===pr.stage);const stgIdx=PIPELINE_STAGES.findIndex((s)=>s.id===pr.stage);
          const avgEst=Math.round((pr.zillowEst+pr.redfinEst+pr.realtorEst)/3);const diff=avgEst-pr.listPrice;const ma=pr.marketAnalysis;const psm=STATE_MARKET_DATA[pr.state];
          return(<div style={{animation:"fu .35s ease"}}>
            <div style={{marginBottom:20}}>
              <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}><Pill c="#6366f1" ch="Prospect"/><Pill c={psm?.color} ch={pr.state}/><span style={{fontSize:11,color:"#6b7280"}}>{pr.city}</span></div>
              <h2 style={{margin:0,fontSize:24,fontWeight:700}}>{pr.name}</h2>
              <p style={{margin:"3px 0 0",fontSize:12,color:"#6b7280"}}>{pr.address}</p>
              <div style={{display:"flex",gap:8,marginTop:8}}>{[pr.type,pr.bedrooms+"bd/"+pr.bathrooms+"ba",pr.sqft.toLocaleString()+" sqft","Built "+pr.yearBuilt].map((t)=><span key={t} style={{fontSize:10,color:"#9ca3af",background:"#111827",padding:"3px 8px",borderRadius:5,border:"1px solid #2d3748"}}>{t}</span>)}</div>
            </div>
            {/* Progress */}
            <Card style={{marginBottom:20,padding:"20px 24px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}><h3 style={{margin:0,fontSize:15,fontWeight:600}}>Purchase Pipeline</h3>
                <div style={{display:"flex",gap:6}}>
                  {stgIdx>0&&<button onClick={()=>updateProspectStage(pr.id,PIPELINE_STAGES[stgIdx-1].id)} style={{background:"#374151",color:"#9ca3af",border:"none",borderRadius:7,padding:"6px 12px",fontSize:11,fontWeight:600,cursor:"pointer"}}>&larr; Previous</button>}
                  {stgIdx<PIPELINE_STAGES.length-1&&<button onClick={()=>updateProspectStage(pr.id,PIPELINE_STAGES[stgIdx+1].id)} style={{...bp,fontSize:11,padding:"6px 14px"}}>{PIPELINE_STAGES[stgIdx+1].id==="closed"?"\u2705 Mark as Closed":"Next: "+PIPELINE_STAGES[stgIdx+1].label+" \u2192"}</button>}
                </div>
              </div>
              <ProgressBar stages={PIPELINE_STAGES} currentStage={pr.stage}/>
            </Card>
            {/* Valuation Cards */}
            <div style={{marginBottom:20}} className="g4">
              {[{l:"LIST PRICE",v:fmt(pr.listPrice),c:"#e5e7eb"},{l:"AVG ESTIMATE",v:fmt(avgEst),c:diff>=0?"#10b981":"#ef4444"},{l:"PRICE vs EST",v:(diff>=0?"+":"")+fmt(diff),c:diff>=0?"#10b981":"#ef4444"},{l:"PRICE / SQ FT",v:"$"+ma.pricePerSqft,c:"#3b82f6"}].map((c,i)=>(<Card key={i}><div style={{fontSize:8,color:"#6b7280",fontFamily:"'JetBrains Mono',monospace",marginBottom:5}}>{c.l}</div><div style={{fontSize:20,fontWeight:700,color:c.c}}>{c.v}</div></Card>))}
            </div>
            <div style={{marginBottom:20}} className="g2">
              {/* Source Estimates */}
              <Card><h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:600}}>Valuation Estimates</h3>
                {[{src:"Zillow",v:pr.zillowEst,c:"#3b82f6",lg:"Z"},{src:"Redfin",v:pr.redfinEst,c:"#ef4444",lg:"R"},{src:"Realtor.com",v:pr.realtorEst,c:"#10b981",lg:"R"}].map((x)=>(<div key={x.src} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #2d3748"}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:28,height:28,borderRadius:6,background:x.c+"20",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:x.c,fontFamily:"'JetBrains Mono',monospace",fontSize:12}}>{x.lg}</div><span style={{fontSize:13,fontWeight:500}}>{x.src}</span></div><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16,fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(x.v)}</span><span style={{fontSize:11,color:x.v>=pr.listPrice?"#10b981":"#ef4444"}}>{x.v>=pr.listPrice?"\u25B2":"\u25BC"} {fmt(Math.abs(x.v-pr.listPrice))}</span></div></div>))}
              </Card>
              {/* Neighborhood Analysis */}
              <Card><h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:600}}>Neighborhood Analysis</h3>
                <div style={{gap:10}} className="g2">
                  {[{l:"Neighborhood Median",v:fmt(ma.neighborhoodMedian)},{l:"Avg Days on Market",v:ma.neighborhoodAvgDOM+" days"},{l:"5-Year Appreciation",v:"+"+ma.appreciation5yr+"%"},{l:"School Rating",v:ma.schoolRating+"/10"},{l:"Crime Index",v:ma.crimeIndex},{l:"Walk Score",v:ma.walkScore+"/100"}].map((x,i)=>(<div key={i} style={{background:"#111827",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:8,color:"#6b7280",fontFamily:"'JetBrains Mono',monospace",marginBottom:3}}>{x.l.toUpperCase()}</div><div style={{fontSize:14,fontWeight:600}}>{x.v}</div></div>))}
                </div>
              </Card>
            </div>
            {/* Comparable Sales */}
            <Card style={{marginBottom:20,padding:0,overflow:"hidden"}}><div style={{padding:"14px 18px 0"}}><h3 style={{margin:0,fontSize:14,fontWeight:600}}>Comparable Sales</h3></div>
              <table style={{width:"100%",display:"block",overflowX:"auto",WebkitOverflowScrolling:"touch",borderCollapse:"collapse",fontSize:12,marginTop:10}}><thead><tr style={{background:"#111827"}}>{["Address","Sale Price","Sq Ft","$/Sq Ft","Date"].map((h)=><th key={h} style={{padding:"8px 14px",textAlign:"left",fontSize:9,fontFamily:"'JetBrains Mono',monospace",color:"#6b7280",fontWeight:600}}>{h.toUpperCase()}</th>)}</tr></thead>
                <tbody>{ma.comparableSales.map((c,i)=>(<tr key={i} style={{borderTop:"1px solid #2d3748"}}><td style={{padding:"8px 14px",fontWeight:500}}>{c.address}</td><td style={{padding:"8px 14px",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(c.price)}</td><td style={{padding:"8px 14px"}}>{c.sqft.toLocaleString()}</td><td style={{padding:"8px 14px",fontFamily:"'JetBrains Mono',monospace"}}>${Math.round(c.price/c.sqft)}</td><td style={{padding:"8px 14px",color:"#9ca3af"}}>{c.date}</td></tr>))}</tbody>
              </table>
            </Card>
            {/* Price History + Notes */}
            <div style={{gap:14}} className="g2">
              <Card><h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:600}}>Listing Activity</h3>
                {pr.priceHistory.map((ev,i)=>(<div key={i} style={{display:"flex",gap:12,alignItems:"center",padding:"8px 0",borderBottom:i<pr.priceHistory.length-1?"1px solid #2d3748":"none"}}><div style={{width:8,height:8,borderRadius:"50%",background:ev.price?"#3b82f6":"#10b981",flexShrink:0}}/><div style={{flex:1}}><div style={{fontSize:12,fontWeight:500}}>{ev.event}</div><div style={{fontSize:10,color:"#6b7280"}}>{ev.date}</div></div>{ev.price&&<div style={{fontSize:13,fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(ev.price)}</div>}</div>))}
              </Card>
              <Card><h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:600}}>Your Notes</h3>
                <div style={{background:"#111827",borderRadius:8,padding:14,fontSize:13,color:"#d1d5db",lineHeight:1.5}}>{pr.notes||"No notes yet."}</div>
                <div style={{marginTop:12,fontSize:11,color:"#6b7280"}}>Added to watchlist: {pr.addedDate}</div>
              </Card>
            </div>
          </div>);
        })()}

        {/* PROPERTY DETAIL */}
        {topNav==="realestate" && view === "property" && prop && (()=>{
          const p=prop,v=avgVal(p),eq=v-p.purchasePrice;
          const mExp=p.expenses.filter((e)=>e.date.startsWith("2026-01")).reduce((s,e)=>s+e.amount,0);
          const tExp=p.expenses.reduce((s,e)=>s+e.amount,0);
          const byCat={};p.expenses.forEach((e)=>{byCat[e.category]=(byCat[e.category]||0)+e.amount;});
          const dd=Object.entries(byCat).map(([c,v])=>({label:c,value:v,color:CAT_C[c]||"#6b7280"}));
          const psm=STATE_MARKET_DATA[p.state];
          const tabs=[{id:"overview",l:"Overview",Ic:I.Home},{id:"valuation",l:"Valuation",Ic:I.Chart},{id:"maintenance",l:"Maintenance",Ic:I.Wrench},{id:"expenses",l:"Expenses",Ic:I.Receipt}];
          return(<div style={{animation:"fu .35s ease"}}>
            <div style={{marginBottom:18}}><div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}><Pill c={psm?.color} ch={p.state}/><span style={{fontSize:11,color:"#6b7280"}}>{p.city}</span></div><h2 style={{margin:0,fontSize:22,fontWeight:700}}>{p.name}</h2><p style={{margin:"3px 0 0",fontSize:12,color:"#6b7280"}}>{p.address}</p><div style={{display:"flex",gap:8,marginTop:8}}>{[p.type,p.bedrooms+"bd/"+p.bathrooms+"ba",p.sqft.toLocaleString()+" sqft","Built "+p.yearBuilt].map((t)=><span key={t} style={{fontSize:10,color:"#9ca3af",background:"#111827",padding:"3px 8px",borderRadius:5,border:"1px solid #2d3748"}}>{t}</span>)}</div></div>
            <div className="prop-tabs">{tabs.map((t)=><button key={t.id} onClick={()=>setTab(t.id)} style={{display:"flex",alignItems:"center",gap:4,padding:"8px 14px",borderRadius:9,border:"none",cursor:"pointer",fontSize:12,fontWeight:500,background:tab===t.id?"linear-gradient(135deg,#3b82f6,#2563eb)":"transparent",color:tab===t.id?"#fff":"#6b7280",transition:"all .2s"}}><t.Ic/> {t.l}</button>)}</div>
            {tab==="overview"&&(<div><div style={{marginBottom:20}} className="g4">{[{l:"MARKET VALUE",v:fmt(v),c:"#3b82f6"},{l:"EQUITY",v:"+"+fmt(eq),c:"#10b981"},{l:"MONTHLY EXP",v:fmt(mExp),c:"#f59e0b"},{l:"OPEN MAINT",v:p.maintenance.filter((m)=>m.status!=="completed").length,c:"#ef4444"}].map((c,i)=>(<Card key={i}><div style={{fontSize:8,color:"#6b7280",fontFamily:"'JetBrains Mono',monospace",marginBottom:5}}>{c.l}</div><div style={{fontSize:20,fontWeight:700,color:c.c}}>{c.v}</div></Card>))}</div><div style={{gap:12}} className="g2e"><Card><h3 style={{margin:"0 0 10px",fontSize:13,fontWeight:600}}>Value Trend</h3><div style={{display:"flex",gap:12,marginBottom:8}}>{[{l:"Zillow",c:"#3b82f6"},{l:"Redfin",c:"#ef4444"},{l:"Realtor",c:"#10b981"}].map((s)=><span key={s.l} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#9ca3af"}}><span style={{width:8,height:3,borderRadius:2,background:s.c}}/> {s.l}</span>)}</div><Spark data={p.marketHistory} keys={["zillow","redfin","realtor"]} colors={["#3b82f6","#ef4444","#10b981"]} height={150}/></Card><Card><h3 style={{margin:"0 0 10px",fontSize:13,fontWeight:600}}>Expenses</h3><div style={{display:"flex",justifyContent:"center"}}><Donut data={dd}/></div><div style={{marginTop:8}}>{dd.map((d)=><div key={d.label} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",fontSize:10}}><span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:2,background:d.color}}/><span style={{color:"#9ca3af"}}>{d.label}</span></span><span style={{fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(d.value)}</span></div>)}</div></Card></div></div>)}
            {tab==="valuation"&&(<div><div style={{marginBottom:20}} className="g3">{[{src:"Zillow",d:p.valuations.zillow,c:"#3b82f6",lg:"Z"},{src:"Redfin",d:p.valuations.redfin,c:"#ef4444",lg:"R"},{src:"Realtor.com",d:p.valuations.realtor,c:"#10b981",lg:"R"}].map((x,i)=>(<Card key={x.src} style={{animation:"fu .3s ease "+(i*.07)+"s both"}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><div style={{width:32,height:32,borderRadius:7,background:x.c+"20",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,color:x.c,fontFamily:"'JetBrains Mono',monospace",fontSize:14}}>{x.lg}</div><div><div style={{fontSize:13,fontWeight:600}}>{x.src}</div><div style={{fontSize:9,color:"#6b7280"}}>{x.d.lastUpdated}</div></div><Pill c="#10b981" ch={"+"+x.d.change+"%"}/></div><div style={{fontSize:24,fontWeight:700,color:x.c}}>{fmt(x.d.value)}</div><div style={{fontSize:11,color:"#6b7280",marginTop:2}}>+{fmt(x.d.value-p.purchasePrice)} since purchase</div></Card>))}</div><Card><h3 style={{margin:"0 0 10px",fontSize:14,fontWeight:600}}>6-Month History</h3><Spark data={p.marketHistory} keys={["zillow","redfin","realtor"]} colors={["#3b82f6","#ef4444","#10b981"]} height={190}/></Card></div>)}
            {tab==="maintenance"&&(<div><div style={{display:"flex",justifyContent:"flex-end",marginBottom:14}}><button onClick={()=>setShowMnt(true)} style={bp}><I.Plus/> New Request</button></div>{p.maintenance.length===0?<Card style={{textAlign:"center",padding:36,color:"#6b7280"}}>No requests yet</Card>:(<div style={{display:"flex",flexDirection:"column",gap:7}}>{p.maintenance.map((m,i)=>{const sc=ST_C[m.status],pc=PR_C[m.priority];return(<Card key={m.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:14}}><div style={{display:"flex",gap:10,alignItems:"center"}}><div style={{width:34,height:34,borderRadius:8,background:sc.bg,display:"flex",alignItems:"center",justifyContent:"center",color:sc.c}}><sc.I/></div><div><div style={{fontSize:13,fontWeight:600}}>{m.title}</div><div style={{fontSize:11,color:"#6b7280"}}>{m.vendor} &middot; {m.date}</div>{m.notes&&<div style={{fontSize:11,color:"#9ca3af",marginTop:1}}>{m.notes}</div>}</div></div><div style={{display:"flex",gap:6,alignItems:"center"}}>{m.cost&&<span style={{fontSize:13,fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(m.cost)}</span>}<Pill c={pc.c} ch={pc.l}/><Pill c={sc.c} bg={sc.bg} ch={sc.l}/></div></Card>);})}</div>)}</div>)}
            {tab==="expenses"&&(<div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><div style={{display:"flex",gap:18}}><div><div style={{fontSize:9,color:"#6b7280",fontFamily:"'JetBrains Mono',monospace"}}>THIS MONTH</div><div style={{fontSize:19,fontWeight:700,color:"#f59e0b"}}>{fmt(mExp)}</div></div><div><div style={{fontSize:9,color:"#6b7280",fontFamily:"'JetBrains Mono',monospace"}}>ALL TIME</div><div style={{fontSize:19,fontWeight:700}}>{fmt(tExp)}</div></div></div><button onClick={()=>setShowExp(true)} style={bp}><I.Plus/> Add Expense</button></div><div style={{gap:12}} className="g1-230"><Card style={{padding:0,overflow:"hidden"}}><table style={{width:"100%",display:"block",overflowX:"auto",WebkitOverflowScrolling:"touch",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{background:"#111827"}}>{["Date","Category","Description","Amount","Invoice"].map((h)=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:9,fontFamily:"'JetBrains Mono',monospace",color:"#6b7280",fontWeight:600}}>{h.toUpperCase()}</th>)}</tr></thead><tbody>{p.expenses.map((e)=>(<tr key={e.id} style={{borderTop:"1px solid #2d3748"}}><td style={{padding:"8px 12px",color:"#9ca3af",fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>{e.date}</td><td style={{padding:"8px 12px"}}><span style={{display:"inline-flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:2,background:CAT_C[e.category]||"#6b7280"}}/>{e.category}</span></td><td style={{padding:"8px 12px",color:"#9ca3af"}}>{e.description}</td><td style={{padding:"8px 12px",fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{fmtD(e.amount)}</td><td style={{padding:"8px 12px"}}>{e.invoice?<span style={{fontSize:10,color:"#3b82f6",background:"#3b82f618",padding:"2px 6px",borderRadius:4}}>{e.invoice}</span>:<span style={{color:"#4b5563"}}>-</span>}</td></tr>))}</tbody></table></Card><Card><h4 style={{margin:"0 0 8px",fontSize:12,fontWeight:600}}>By Category</h4><Donut data={dd} size={170}/><div style={{marginTop:8}}>{dd.sort((a,b)=>b.value-a.value).map((d)=><div key={d.label} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",fontSize:10,borderBottom:"1px solid #2d3748"}}><span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:2,background:d.color}}/> {d.label}</span><span style={{fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(d.value)}</span></div>)}</div></Card></div></div>)}
          </div>);
        })()}
      {/* ═══════════════ WEALTH DASHBOARD ═══════════════ */}
        {topNav==="wealth" && wealthView==="overview" && (<div style={{animation:"fu .35s ease"}}>
          {/* Net Worth Banner */}
          <div style={{background:"linear-gradient(135deg,#10b98114,#111827 50%,#10b98106)",border:"1px solid #10b98130",borderRadius:16,padding:26,marginBottom:22,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:-20,right:-10,fontSize:100,fontWeight:900,color:"#10b98106",fontFamily:"'JetBrains Mono',monospace",lineHeight:1,pointerEvents:"none"}}>$</div>
            <h2 style={{margin:"0 0 6px",fontSize:22,fontWeight:800,letterSpacing:"-.03em"}}>Net Worth Overview</h2>
            <p style={{margin:"0 0 18px",fontSize:12,color:"#6b7280"}}>Total assets minus liabilities across all accounts</p>
            <div className="g4" style={{marginBottom:0}}>
              {[{l:"NET WORTH",v:fmt(netWorth),c:"#10b981"},{l:"TOTAL ASSETS",v:fmt(totalAssets),c:"#3b82f6"},{l:"TOTAL LIABILITIES",v:fmt(totalLiabilities),c:"#ef4444"},{l:"DEBT-TO-ASSET",v:(totalAssets>0?((totalLiabilities/totalAssets)*100).toFixed(1):0)+"%",c:"#f59e0b"}].map((c,i)=>(<div key={i} style={{background:"#111827",border:"1px solid #2d3748",borderRadius:10,padding:"12px 14px",animation:"fu .3s ease "+(i*.04)+"s both"}}><div style={{fontSize:8,color:"#6b7280",fontFamily:"'JetBrains Mono',monospace",letterSpacing:".06em",marginBottom:5}}>{c.l}</div><div style={{fontSize:18,fontWeight:700,color:c.c,letterSpacing:"-.01em"}}>{c.v}</div></div>))}
            </div>
          </div>
          {/* Asset Breakdown */}
          <div className="g2" style={{marginBottom:22}}>
            <Card><h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:600}}>Asset Allocation</h3>
              <Donut data={[{label:"Real Estate",value:totVal,color:"#3b82f6"},{label:"Stocks",value:stocksValue,color:"#10b981"},{label:"Retirement",value:retirementValue,color:"#8b5cf6"},{label:"Other",value:otherAssetsValue,color:"#f59e0b"}]} size={180}/>
              <div style={{marginTop:12}}>{[{l:"Real Estate",v:totVal,c:"#3b82f6",pct:((totVal/totalAssets)*100).toFixed(1)},{l:"Stocks",v:stocksValue,c:"#10b981",pct:((stocksValue/totalAssets)*100).toFixed(1)},{l:"Retirement",v:retirementValue,c:"#8b5cf6",pct:((retirementValue/totalAssets)*100).toFixed(1)},{l:"Other Assets",v:otherAssetsValue,c:"#f59e0b",pct:((otherAssetsValue/totalAssets)*100).toFixed(1)}].map((d)=><div key={d.l} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:11,borderBottom:"1px solid #2d3748"}}><span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:8,height:8,borderRadius:2,background:d.c}}/>{d.l}</span><span style={{fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(d.v)} <span style={{color:"#6b7280",fontSize:9}}>({d.pct}%)</span></span></div>)}</div>
            </Card>
            <Card><h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:600}}>Liabilities Breakdown</h3>
              {(() => {const byType={};liabilities.forEach((l)=>{byType[l.type]=(byType[l.type]||0)+l.balance;});const ld=Object.entries(byType).map(([t,v])=>({label:t.charAt(0).toUpperCase()+t.slice(1),value:v,color:LIAB_COLORS[t]||"#6b7280"}));return(<><Donut data={ld} size={180}/><div style={{marginTop:12}}>{ld.map((d)=><div key={d.label} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:11,borderBottom:"1px solid #2d3748"}}><span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:8,height:8,borderRadius:2,background:d.color}}/>{d.label}</span><span style={{fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(d.value)}</span></div>)}</div></>);})()}
            </Card>
          </div>
          {/* Category Cards */}
          <div className="g4" style={{marginBottom:22}}>
            {[{l:"Stock Portfolio",v:fmt(stocksValue),s:(stocksGain>=0?"+":"")+fmt(stocksGain)+" gain",sc:stocksGain>=0?"#10b981":"#ef4444",Ic:I.Stock,click:()=>setWealthView("stocks"),bg:"#10b981"},{l:"Retirement",v:fmt(retirementValue),s:retirement.length+" accounts",sc:"#8b5cf6",Ic:I.Shield,click:()=>setWealthView("retirement"),bg:"#8b5cf6"},{l:"Other Assets",v:fmt(otherAssetsValue),s:otherAssets.length+" accounts",sc:"#f59e0b",Ic:I.Wallet,click:()=>setWealthView("other"),bg:"#f59e0b"},{l:"Real Estate Equity",v:fmt(totEq),s:properties.length+" properties",sc:"#3b82f6",Ic:I.Home,click:()=>{setTopNav("realestate");setView("portfolio");},bg:"#3b82f6"}].map((c,i)=>(<Card key={i} style={{cursor:"pointer",transition:"all .2s",animation:"fu .3s ease "+(i*.06)+"s both"}} onClick={c.click} onMouseEnter={(e)=>{e.currentTarget.style.borderColor=c.bg;e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={(e)=>{e.currentTarget.style.borderColor="#2d3748";e.currentTarget.style.transform="none";}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><div style={{width:32,height:32,borderRadius:8,background:c.bg+"20",display:"flex",alignItems:"center",justifyContent:"center",color:c.bg}}><c.Ic/></div><div style={{fontSize:8,color:"#6b7280",fontFamily:"'JetBrains Mono',monospace"}}>{c.l.toUpperCase()}</div></div>
              <div style={{fontSize:20,fontWeight:700,color:"#e5e7eb",marginBottom:4}}>{c.v}</div>
              <div style={{fontSize:10,color:c.sc}}>{c.s}</div>
            </Card>))}
          </div>
          {/* Liabilities Table */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}><h3 style={{margin:0,fontSize:15,fontWeight:700}}>Liabilities</h3><button onClick={()=>setShowAddLiability(true)} style={bp}><I.Plus/> Add</button></div>
          <Card style={{padding:0,overflow:"hidden",marginBottom:22}}>
            <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:600}}><thead><tr style={{background:"#111827"}}>{["Name","Type","Balance","Rate","Monthly","Paid Off"].map((h)=><th key={h} style={{padding:"8px 14px",textAlign:"left",fontSize:9,fontFamily:"'JetBrains Mono',monospace",color:"#6b7280",fontWeight:600}}>{h.toUpperCase()}</th>)}</tr></thead>
              <tbody>{liabilities.map((l)=>{const paidPct=((l.originalBalance-l.balance)/l.originalBalance*100).toFixed(0);return(<tr key={l.id} style={{borderTop:"1px solid #2d3748"}}><td style={{padding:"8px 14px",fontWeight:500}}><span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:6,height:6,borderRadius:2,background:LIAB_COLORS[l.type]||"#6b7280"}}/>{l.name}</span></td><td style={{padding:"8px 14px",textTransform:"capitalize"}}>{l.type}</td><td style={{padding:"8px 14px",fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>{fmt(l.balance)}</td><td style={{padding:"8px 14px",fontFamily:"'JetBrains Mono',monospace"}}>{l.rate}%</td><td style={{padding:"8px 14px",fontFamily:"'JetBrains Mono',monospace"}}>{fmt(l.monthlyPayment)}</td><td style={{padding:"8px 14px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{flex:1,height:6,background:"#2d3748",borderRadius:3,overflow:"hidden"}}><div style={{width:paidPct+"%",height:"100%",background:"#10b981",borderRadius:3}}/></div><span style={{fontSize:10,color:"#10b981",fontFamily:"'JetBrains Mono',monospace"}}>{paidPct}%</span></div></td></tr>);})}</tbody>
            </table></div>
          </Card>
          {/* Connect Brokerage CTA */}
          <Card style={{background:"linear-gradient(135deg,#1f293780,#111827)",border:"1px dashed #374151",textAlign:"center",padding:30}}>
            <div style={{width:48,height:48,borderRadius:12,background:"#3b82f620",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",color:"#3b82f6"}}><I.Link/></div>
            <h3 style={{margin:"0 0 6px",fontSize:16,fontWeight:700}}>Connect Your Brokerage</h3>
            <p style={{margin:"0 0 16px",fontSize:12,color:"#6b7280",maxWidth:400,marginLeft:"auto",marginRight:"auto"}}>Automatically sync your stock portfolio, retirement accounts, and bank balances. Support for Schwab, Fidelity, Vanguard, Robinhood &amp; more coming soon.</p>
            <button style={{...bp,background:"linear-gradient(135deg,#3b82f6,#6366f1)",padding:"10px 24px",fontSize:13,opacity:.6,cursor:"not-allowed"}}>Coming Soon</button>
          </Card>
        </div>)}

        {/* STOCKS VIEW */}
        {topNav==="wealth" && wealthView==="stocks" && (<div style={{animation:"fu .35s ease"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:10}}>
            <div><h2 style={{margin:0,fontSize:20,fontWeight:700}}>Stock Portfolio</h2><p style={{margin:"3px 0 0",fontSize:12,color:"#6b7280"}}>{stocks.length} positions across {[...new Set(stocks.map((s)=>s.brokerage))].length} brokerages</p></div>
            <button onClick={()=>setShowAddStock(true)} style={bp}><I.Plus/> Add Stock</button>
          </div>
          <div className="g4" style={{marginBottom:20}}>
            {[{l:"MARKET VALUE",v:fmt(stocksValue),c:"#10b981"},{l:"COST BASIS",v:fmt(stocksCostBasis),c:"#6b7280"},{l:"TOTAL GAIN/LOSS",v:(stocksGain>=0?"+":"")+fmt(stocksGain),c:stocksGain>=0?"#10b981":"#ef4444"},{l:"RETURN",v:(stocksCostBasis>0?(((stocksValue-stocksCostBasis)/stocksCostBasis)*100).toFixed(1):0)+"%",c:stocksGain>=0?"#10b981":"#ef4444"}].map((c,i)=>(<Card key={i}><div style={{fontSize:8,color:"#6b7280",fontFamily:"'JetBrains Mono',monospace",marginBottom:5}}>{c.l}</div><div style={{fontSize:20,fontWeight:700,color:c.c}}>{c.v}</div></Card>))}
          </div>
          <Card style={{padding:0,overflow:"hidden"}}>
            <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:700}}><thead><tr style={{background:"#111827"}}>{["Ticker","Name","Shares","Cost Basis","Price","Value","Gain/Loss","Brokerage"].map((h)=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:9,fontFamily:"'JetBrains Mono',monospace",color:"#6b7280",fontWeight:600}}>{h.toUpperCase()}</th>)}</tr></thead>
              <tbody>{stocks.map((s)=>{const val=s.shares*s.currentPrice,cost=s.shares*s.costBasis,gain=val-cost,pct=((gain/cost)*100).toFixed(1);return(<tr key={s.id} style={{borderTop:"1px solid #2d3748"}}>
                <td style={{padding:"8px 12px",fontWeight:700,color:"#e5e7eb",fontFamily:"'JetBrains Mono',monospace"}}>{s.ticker}</td>
                <td style={{padding:"8px 12px",color:"#9ca3af"}}>{s.name}</td>
                <td style={{padding:"8px 12px",fontFamily:"'JetBrains Mono',monospace"}}>{s.shares}</td>
                <td style={{padding:"8px 12px",fontFamily:"'JetBrains Mono',monospace"}}>{fmtD(s.costBasis)}</td>
                <td style={{padding:"8px 12px",fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>{fmtD(s.currentPrice)}</td>
                <td style={{padding:"8px 12px",fontFamily:"'JetBrains Mono',monospace",fontWeight:600}}>{fmt(val)}</td>
                <td style={{padding:"8px 12px",fontFamily:"'JetBrains Mono',monospace",color:gain>=0?"#10b981":"#ef4444"}}>{gain>=0?"+":""}{fmt(gain)} <span style={{fontSize:10}}>({pct}%)</span></td>
                <td style={{padding:"8px 12px"}}><Pill c={s.brokerage==="Schwab"?"#3b82f6":s.brokerage==="Fidelity"?"#10b981":"#f59e0b"} ch={s.brokerage}/></td>
              </tr>);})}</tbody>
            </table></div>
          </Card>
          {/* By Sector */}
          <div className="g2" style={{marginTop:20}}>
            <Card><h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:600}}>By Sector</h3>
              {(()=>{const bySector={};stocks.forEach((s)=>{bySector[s.sector]=(bySector[s.sector]||0)+s.shares*s.currentPrice;});const sd=Object.entries(bySector).map(([k,v],i)=>({label:k,value:v,color:["#3b82f6","#10b981","#f59e0b","#8b5cf6","#ef4444"][i%5]}));return(<><Donut data={sd} size={160}/><div style={{marginTop:10}}>{sd.map((d)=><div key={d.label} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",fontSize:10,borderBottom:"1px solid #2d3748"}}><span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:2,background:d.color}}/> {d.label}</span><span style={{fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(d.value)}</span></div>)}</div></>);})()}
            </Card>
            <Card><h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:600}}>By Brokerage</h3>
              {(()=>{const byBroker={};stocks.forEach((s)=>{byBroker[s.brokerage]=(byBroker[s.brokerage]||0)+s.shares*s.currentPrice;});const bd=Object.entries(byBroker).map(([k,v],i)=>({label:k,value:v,color:["#3b82f6","#10b981","#f59e0b"][i%3]}));return(<><Donut data={bd} size={160}/><div style={{marginTop:10}}>{bd.map((d)=><div key={d.label} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",fontSize:10,borderBottom:"1px solid #2d3748"}}><span style={{display:"flex",alignItems:"center",gap:4}}><span style={{width:6,height:6,borderRadius:2,background:d.color}}/> {d.label}</span><span style={{fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{fmt(d.value)}</span></div>)}</div></>);})()}
            </Card>
          </div>
        </div>)}

        {/* RETIREMENT VIEW */}
        {topNav==="wealth" && wealthView==="retirement" && !selRetId && (<div style={{animation:"fu .35s ease"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:10}}>
            <div><h2 style={{margin:0,fontSize:20,fontWeight:700}}>Retirement Accounts</h2><p style={{margin:"3px 0 0",fontSize:12,color:"#6b7280"}}>{retirement.length} accounts &middot; {fmt(retirementValue)} total balance</p></div>
            <button onClick={()=>setShowAddRetirement(true)} style={{...bp,background:"linear-gradient(135deg,#8b5cf6,#6366f1)"}}><I.Plus/> Add Account</button>
          </div>
          <div className="g3">
            {retirement.map((r,i)=>{const gainPct=r.contributions>0?(((r.balance-r.contributions)/r.contributions)*100).toFixed(1):0;const ytdPct=r.ytdLimit>0?((r.ytdContribution/r.ytdLimit)*100).toFixed(0):0;return(
              <Card key={r.id} style={{cursor:"pointer",transition:"all .2s",animation:"fu .3s ease "+(i*.06)+"s both"}} onClick={()=>setSelRetId(r.id)} onMouseEnter={(e)=>{e.currentTarget.style.borderColor="#8b5cf6";e.currentTarget.style.transform="translateY(-2px)";}} onMouseLeave={(e)=>{e.currentTarget.style.borderColor="#2d3748";e.currentTarget.style.transform="none";}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><div style={{width:36,height:36,borderRadius:8,background:ACCT_COLORS[r.type]+"20",display:"flex",alignItems:"center",justifyContent:"center",color:ACCT_COLORS[r.type]}}><I.Shield/></div><div><div style={{fontSize:14,fontWeight:600}}>{r.name}</div><div style={{fontSize:10,color:"#6b7280"}}>{r.provider}</div></div></div>
                <div style={{fontSize:26,fontWeight:700,color:"#e5e7eb",marginBottom:4}}>{fmt(r.balance)}</div>
                <div style={{fontSize:11,color:parseFloat(gainPct)>=0?"#10b981":"#ef4444",marginBottom:12}}>+{fmt(r.balance-r.contributions)} ({gainPct}%) total return</div>
                <div style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3}}><span style={{color:"#6b7280"}}>YTD Contributions</span><span style={{fontFamily:"'JetBrains Mono',monospace"}}>{fmt(r.ytdContribution)} / {fmt(r.ytdLimit)}</span></div><div style={{height:6,background:"#2d3748",borderRadius:3,overflow:"hidden"}}><div style={{width:ytdPct+"%",height:"100%",background:ACCT_COLORS[r.type],borderRadius:3,transition:"width .3s"}}/></div></div>
                <Spark data={r.history} keys={["value"]} colors={[ACCT_COLORS[r.type]]} height={60}/>
              </Card>);})}
          </div>
        </div>)}

        {/* RETIREMENT DETAIL VIEW */}
        {topNav==="wealth" && wealthView==="retirement" && selRet && (<div style={{animation:"fu .35s ease"}}>
          <div style={{marginBottom:18}}><div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}><Pill c={ACCT_COLORS[selRet.type]} ch={selRet.type.replace("_"," ").toUpperCase()}/><span style={{fontSize:11,color:"#6b7280"}}>{selRet.provider}</span></div><h2 style={{margin:0,fontSize:22,fontWeight:700}}>{selRet.name}</h2></div>
          <div className="g4" style={{marginBottom:20}}>
            {[{l:"BALANCE",v:fmt(selRet.balance),c:ACCT_COLORS[selRet.type]},{l:"CONTRIBUTIONS",v:fmt(selRet.contributions),c:"#6b7280"},{l:"GROWTH",v:"+"+fmt(selRet.balance-selRet.contributions),c:"#10b981"},{l:"EMPLOYER MATCH",v:fmt(selRet.employerMatch),c:"#3b82f6"}].map((c,i)=>(<Card key={i}><div style={{fontSize:8,color:"#6b7280",fontFamily:"'JetBrains Mono',monospace",marginBottom:5}}>{c.l}</div><div style={{fontSize:20,fontWeight:700,color:c.c}}>{c.v}</div></Card>))}
          </div>
          <div className="g2" style={{marginBottom:20}}>
            <Card><h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:600}}>Balance History</h3><Spark data={selRet.history} keys={["value"]} colors={[ACCT_COLORS[selRet.type]]} height={160}/></Card>
            <Card><h3 style={{margin:"0 0 12px",fontSize:14,fontWeight:600}}>Asset Allocation</h3><Donut data={selRet.allocation.map((a)=>({label:a.label,value:a.pct,color:a.color}))} size={160}/><div style={{marginTop:10}}>{selRet.allocation.map((a)=><div key={a.label} style={{display:"flex",justifyContent:"space-between",padding:"3px 0",fontSize:11,borderBottom:"1px solid #2d3748"}}><span style={{display:"flex",alignItems:"center",gap:6}}><span style={{width:8,height:8,borderRadius:2,background:a.color}}/>{a.label}</span><span style={{fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{a.pct}%</span></div>)}</div></Card>
          </div>
          <Card><h3 style={{margin:"0 0 10px",fontSize:14,fontWeight:600}}>YTD Contribution Progress</h3>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6}}><span style={{color:"#9ca3af"}}>Contributed: {fmt(selRet.ytdContribution)}</span><span style={{color:"#9ca3af"}}>Limit: {fmt(selRet.ytdLimit)}</span></div>
            <div style={{height:12,background:"#2d3748",borderRadius:6,overflow:"hidden",marginBottom:6}}><div style={{width:((selRet.ytdContribution/selRet.ytdLimit)*100)+"%",height:"100%",background:"linear-gradient(90deg,"+ACCT_COLORS[selRet.type]+","+ACCT_COLORS[selRet.type]+"80)",borderRadius:6,transition:"width .4s"}}/></div>
            <div style={{fontSize:11,color:"#6b7280"}}>{fmt(selRet.ytdLimit-selRet.ytdContribution)} remaining for 2026</div>
          </Card>
        </div>)}

        {/* OTHER ASSETS VIEW */}
        {topNav==="wealth" && wealthView==="other" && (<div style={{animation:"fu .35s ease"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,flexWrap:"wrap",gap:10}}>
            <div><h2 style={{margin:0,fontSize:20,fontWeight:700}}>Other Investments &amp; Savings</h2><p style={{margin:"3px 0 0",fontSize:12,color:"#6b7280"}}>{otherAssets.length} accounts &middot; {fmt(otherAssetsValue)} total</p></div>
            <button onClick={()=>setShowAddOther(true)} style={{...bp,background:"linear-gradient(135deg,#f59e0b,#d97706)"}}><I.Plus/> Add Account</button>
          </div>
          <div className="g3">
            {otherAssets.map((a,i)=>{const gain=a.costBasis?a.balance-a.costBasis:null;return(
              <Card key={a.id} style={{animation:"fu .3s ease "+(i*.06)+"s both"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}><div style={{width:36,height:36,borderRadius:8,background:a.color+"20",display:"flex",alignItems:"center",justifyContent:"center",color:a.color}}>{a.type==="crypto"?<I.Stock/>:a.type==="savings"?<I.Bank/>:<I.Shield/>}</div><div style={{flex:1}}><div style={{fontSize:14,fontWeight:600}}>{a.name}</div><div style={{fontSize:10,color:"#6b7280"}}>{a.institution}</div></div><Pill c={a.color} ch={a.type.toUpperCase()}/></div>
                <div style={{fontSize:24,fontWeight:700,color:"#e5e7eb",marginBottom:4}}>{fmt(a.balance)}</div>
                {a.apy&&<div style={{fontSize:11,color:"#10b981"}}>APY: {a.apy}%</div>}
                {gain!==null&&<div style={{fontSize:11,color:gain>=0?"#10b981":"#ef4444"}}>{gain>=0?"+":""}{fmt(gain)} ({a.costBasis>0?((gain/a.costBasis)*100).toFixed(1):0}%)</div>}
                {a.units&&<div style={{fontSize:10,color:"#6b7280",marginTop:2}}>{a.units} units &middot; {fmt(a.balance/a.units)}/unit</div>}
                {a.maturityDate&&<div style={{fontSize:10,color:"#6b7280",marginTop:2}}>Matures: {a.maturityDate}</div>}
              </Card>);})}
          </div>
        </div>)}

      </main>

      {/* MODALS */}
      <Modal open={showExp} onClose={()=>{setShowExp(false);setFiles([]);}} title="Add Expense">
        <form onSubmit={(e)=>{e.preventDefault();const fd=new FormData(e.target);setProperties((prev)=>prev.map((p)=>p.id===selPropId?{...p,expenses:[{id:Date.now(),date:fd.get("date"),category:fd.get("category"),amount:parseFloat(fd.get("amount")),description:fd.get("description"),recurring:fd.get("recurring")==="on",invoice:files[0]?.name||null},...p.expenses]}:p));setShowExp(false);setFiles([]);}}>
          <div className="gf2"><Inp label="Date" name="date" type="date" defaultValue="2026-02-09" required/><Sel label="Category" name="category" options={Object.keys(CAT_C).map((c)=>({value:c,label:c}))}/></div>
          <Inp label="Amount ($)" name="amount" type="number" step="0.01" placeholder="0.00" required/><Inp label="Description" name="description" placeholder="What was this for?" required/>
          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:"#9ca3af",marginBottom:12,cursor:"pointer"}}><input type="checkbox" name="recurring" style={{accentColor:"#3b82f6"}}/> Recurring</label>
          <div style={{marginBottom:14}}><label style={{display:"block",fontSize:11,color:"#9ca3af",marginBottom:4,fontWeight:500}}>Invoice / Receipt</label><div onClick={()=>fRef.current?.click()} style={{border:"2px dashed #374151",borderRadius:9,padding:16,textAlign:"center",cursor:"pointer"}} onMouseEnter={(e)=>e.currentTarget.style.borderColor="#3b82f6"} onMouseLeave={(e)=>e.currentTarget.style.borderColor="#374151"}><input ref={fRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" multiple onChange={(e)=>setFiles((p)=>[...p,...Array.from(e.target.files).map((f)=>({name:f.name}))])}/><div style={{color:"#6b7280"}}><I.Upload/></div><div style={{fontSize:11,color:"#9ca3af",marginTop:3}}>Upload invoice or receipt</div></div>{files.map((f,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 8px",background:"#111827",borderRadius:5,marginTop:3,fontSize:11,color:"#9ca3af"}}>{f.name}<button type="button" onClick={()=>setFiles((p)=>p.filter((_,j)=>j!==i))} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer"}}><I.X/></button></div>)}</div>
          <button type="submit" style={{...bp,width:"100%",justifyContent:"center"}}>Add Expense</button>
        </form>
      </Modal>

      <Modal open={showMnt} onClose={()=>setShowMnt(false)} title="New Maintenance Request">
        <form onSubmit={(e)=>{e.preventDefault();const fd=new FormData(e.target);setProperties((prev)=>prev.map((p)=>p.id===selPropId?{...p,maintenance:[{id:Date.now(),title:fd.get("title"),status:fd.get("status"),priority:fd.get("priority"),date:fd.get("date"),vendor:fd.get("vendor"),notes:fd.get("notes"),cost:fd.get("cost")?parseFloat(fd.get("cost")):null},...p.maintenance]}:p));setShowMnt(false);}}>
          <Inp label="Title" name="title" placeholder="e.g., Fix leaky faucet" required/>
          <div className="gf2"><Sel label="Priority" name="priority" options={[{value:"high",label:"High"},{value:"medium",label:"Medium"},{value:"low",label:"Low"}]}/><Sel label="Status" name="status" options={[{value:"pending",label:"Pending"},{value:"scheduled",label:"Scheduled"},{value:"in-progress",label:"In Progress"},{value:"completed",label:"Completed"}]}/></div>
          <div className="gf2"><Inp label="Date" name="date" type="date" defaultValue="2026-02-09" required/><Inp label="Est. Cost ($)" name="cost" type="number" step="0.01" placeholder="Optional"/></div>
          <Inp label="Vendor" name="vendor" placeholder="Contractor name"/>
          <div style={{marginBottom:12}}><label style={{display:"block",fontSize:11,color:"#9ca3af",marginBottom:3,fontWeight:500}}>Notes</label><textarea name="notes" rows={3} placeholder="Details..." style={{width:"100%",padding:"8px 10px",background:"#111827",border:"1px solid #374151",borderRadius:7,color:"#e5e7eb",fontSize:12,outline:"none",resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}}/></div>
          <button type="submit" style={{...bp,width:"100%",justifyContent:"center"}}>Create Request</button>
        </form>
      </Modal>

      <Modal open={showAdd} onClose={()=>{setShowAdd(false);setFetchStatus("");}} title="Add Property">
        <form ref={(el)=>{if(el)el._formRef=el;}} onSubmit={(e)=>{e.preventDefault();const fd=new FormData(e.target);const pp=parseFloat(fd.get("pp"));const apiData=e.target._apiData||null;const valEst=apiData?.valuation?.price||pp;const rentEst=apiData?.rent?.rent||null;const comps=apiData?.valuation?.comparables||[];const mkt=apiData?.market||null;const today=new Date().toISOString().split("T")[0];const mo=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][new Date().getMonth()];
          setProperties((prev)=>[...prev,{id:Date.now(),name:fd.get("name"),state:fd.get("state"),city:fd.get("city"),address:fd.get("addr")+(fd.get("zip")?" "+fd.get("zip"):""),type:fd.get("type"),bedrooms:parseInt(fd.get("bd")),bathrooms:parseFloat(fd.get("ba")),sqft:parseInt(fd.get("sqft")),yearBuilt:parseInt(fd.get("yr")),purchasePrice:pp,purchaseDate:fd.get("pd"),
            valuations:{
              zillow:{value:valEst,change:0,lastUpdated:today},
              redfin:{value:apiData?.valuation?.priceRangeLow||valEst,change:0,lastUpdated:today},
              realtor:{value:apiData?.valuation?.priceRangeHigh||valEst,change:0,lastUpdated:today}
            },
            rentEstimate:rentEst,
            apiValuation:apiData?.valuation||null,
            apiMarket:mkt,
            apiComparables:comps,
            marketHistory:[{month:mo,zillow:valEst,redfin:apiData?.valuation?.priceRangeLow||valEst,realtor:apiData?.valuation?.priceRangeHigh||valEst}],
            expenses:[],maintenance:[]}]);setShowAdd(false);setFetchStatus("");}}>
          <Inp label="Property Name" name="name" placeholder="e.g., Mountain View Home" required/>
          <div className="gf2"><Sel label="State" name="state" options={[{value:"Colorado",label:"Colorado"},{value:"Utah",label:"Utah"},{value:"Arizona",label:"Arizona"},{value:"Texas",label:"Texas"},{value:"California",label:"California"},{value:"Florida",label:"Florida"}]}/><Inp label="City" name="city" placeholder="Denver" required/></div>
          <div className="gf2"><Inp label="Street Address" name="addr" placeholder="742 Evergreen Terrace" required/><Inp label="Zip Code" name="zip" placeholder="80203" required/></div>
          <div style={{marginBottom:12}}><button type="button" onClick={(e)=>handleFetchProperty(e.target.closest("form"))} disabled={fetchingData} style={{...bp,width:"100%",justifyContent:"center",background:fetchingData?"#374151":"linear-gradient(135deg,#8b5cf6,#6366f1)",opacity:fetchingData?.7:1,cursor:fetchingData?"wait":"pointer"}}>{fetchingData?"Fetching data...":"Fetch Real Market Data"}</button>
            {fetchStatus&&<div style={{marginTop:6,fontSize:11,padding:"6px 10px",borderRadius:6,background:fetchStatus.startsWith("Error")?"#ef444418":"#10b98118",color:fetchStatus.startsWith("Error")?"#f87171":"#34d399",border:"1px solid "+(fetchStatus.startsWith("Error")?"#ef444430":"#10b98130")}}>{fetchStatus}</div>}
          </div>
          <div className="gf2"><Sel label="Type" name="type" options={[{value:"Single Family",label:"Single Family"},{value:"Condo",label:"Condo"},{value:"Townhouse",label:"Townhouse"},{value:"Multi-Family",label:"Multi-Family"}]}/><Inp label="Year Built" name="yr" type="number" placeholder="2020" required/></div>
          <div className="gf3"><Inp label="Beds" name="bd" type="number" placeholder="3" required/><Inp label="Baths" name="ba" type="number" step="0.5" placeholder="2" required/><Inp label="Sq Ft" name="sqft" type="number" placeholder="2000" required/></div>
          <div className="gf2"><Inp label="Purchase Price ($)" name="pp" type="number" placeholder="350000" required/><Inp label="Purchase Date" name="pd" type="date" required/></div>
          <button type="submit" style={{...bp,width:"100%",justifyContent:"center",marginTop:4}}>Add Property</button>
        </form>
      </Modal>

      <Modal open={showAddProspect} onClose={()=>setShowAddProspect(false)} title="Add Prospect Property">
        <form onSubmit={(e)=>{e.preventDefault();const fd=new FormData(e.target);const lp=parseFloat(fd.get("lp"));setProspects((prev)=>[...prev,{id:Date.now(),name:fd.get("name"),state:fd.get("state"),city:fd.get("city"),address:fd.get("addr"),type:fd.get("type"),bedrooms:parseInt(fd.get("bd")),bathrooms:parseFloat(fd.get("ba")),sqft:parseInt(fd.get("sqft")),yearBuilt:parseInt(fd.get("yr")),listPrice:lp,stage:"interested",addedDate:new Date().toISOString().split("T")[0],notes:fd.get("notes")||"",zillowEst:lp,redfinEst:lp,realtorEst:lp,priceHistory:[{date:new Date().toISOString().split("T")[0],price:lp,event:"Added to watchlist"}],marketAnalysis:{neighborhoodMedian:lp*0.95,pricePerSqft:Math.round(lp/parseInt(fd.get("sqft"))),neighborhoodAvgDOM:45,comparableSales:[],appreciation5yr:15,schoolRating:7,crimeIndex:"Low",walkScore:50}}]);setShowAddProspect(false);}}>
          <Inp label="Property Name" name="name" placeholder="e.g., Mountain View Home" required/>
          <div className="gf2"><Sel label="State" name="state" options={[{value:"Colorado",label:"Colorado"},{value:"Utah",label:"Utah"}]} defaultValue={selState||"Colorado"}/><Inp label="City" name="city" placeholder="Denver" required/></div>
          <Inp label="Address" name="addr" placeholder="Full address" required/>
          <div className="gf2"><Sel label="Type" name="type" options={[{value:"Single Family",label:"Single Family"},{value:"Condo",label:"Condo"},{value:"Townhouse",label:"Townhouse"},{value:"Multi-Family",label:"Multi-Family"}]}/><Inp label="Year Built" name="yr" type="number" placeholder="2020" required/></div>
          <div className="gf3"><Inp label="Beds" name="bd" type="number" placeholder="3" required/><Inp label="Baths" name="ba" type="number" step="0.5" placeholder="2" required/><Inp label="Sq Ft" name="sqft" type="number" placeholder="2000" required/></div>
          <Inp label="List Price ($)" name="lp" type="number" placeholder="500000" required/>
          <div style={{marginBottom:12}}><label style={{display:"block",fontSize:11,color:"#9ca3af",marginBottom:3,fontWeight:500}}>Notes</label><textarea name="notes" rows={3} placeholder="Why are you interested? Any observations..." style={{width:"100%",padding:"8px 10px",background:"#111827",border:"1px solid #374151",borderRadius:7,color:"#e5e7eb",fontSize:12,outline:"none",resize:"vertical",fontFamily:"inherit",boxSizing:"border-box"}}/></div>
          <button type="submit" style={{...bp,width:"100%",justifyContent:"center",background:"linear-gradient(135deg,#6366f1,#8b5cf6)"}}>Add to Watchlist</button>
        </form>
      </Modal>

      {/* WEALTH MODALS */}
      <Modal open={showAddStock} onClose={()=>setShowAddStock(false)} title="Add Stock Position">
        <form onSubmit={(e)=>{e.preventDefault();const fd=new FormData(e.target);setStocks((prev)=>[...prev,{id:Date.now(),ticker:fd.get("ticker").toUpperCase(),name:fd.get("name"),shares:parseFloat(fd.get("shares")),costBasis:parseFloat(fd.get("cost")),currentPrice:parseFloat(fd.get("price")),sector:fd.get("sector"),brokerage:fd.get("brokerage")}]);setShowAddStock(false);}}>
          <div className="gf2"><Inp label="Ticker" name="ticker" placeholder="AAPL" required/><Inp label="Company Name" name="name" placeholder="Apple Inc." required/></div>
          <div className="gf3"><Inp label="Shares" name="shares" type="number" step="0.01" placeholder="10" required/><Inp label="Cost Basis ($)" name="cost" type="number" step="0.01" placeholder="150.00" required/><Inp label="Current Price ($)" name="price" type="number" step="0.01" placeholder="198.00" required/></div>
          <div className="gf2"><Sel label="Sector" name="sector" options={[{value:"Technology",label:"Technology"},{value:"Consumer",label:"Consumer"},{value:"Healthcare",label:"Healthcare"},{value:"Finance",label:"Finance"},{value:"Energy",label:"Energy"},{value:"Index Fund",label:"Index Fund / ETF"},{value:"Other",label:"Other"}]}/><Sel label="Brokerage" name="brokerage" options={[{value:"Schwab",label:"Schwab"},{value:"Fidelity",label:"Fidelity"},{value:"Vanguard",label:"Vanguard"},{value:"Robinhood",label:"Robinhood"},{value:"TD Ameritrade",label:"TD Ameritrade"},{value:"Other",label:"Other"}]}/></div>
          <button type="submit" style={{...bp,width:"100%",justifyContent:"center",background:"linear-gradient(135deg,#10b981,#059669)"}}>Add Position</button>
        </form>
      </Modal>

      <Modal open={showAddRetirement} onClose={()=>setShowAddRetirement(false)} title="Add Retirement Account">
        <form onSubmit={(e)=>{e.preventDefault();const fd=new FormData(e.target);setRetirement((prev)=>[...prev,{id:Date.now(),name:fd.get("name"),type:fd.get("type"),provider:fd.get("provider"),balance:parseFloat(fd.get("balance")),contributions:parseFloat(fd.get("contributions")||0),employerMatch:parseFloat(fd.get("match")||0),ytdContribution:parseFloat(fd.get("ytd")||0),ytdLimit:fd.get("type")==="401k"?23500:7000,allocation:[{label:"Mixed",pct:100,color:ACCT_COLORS[fd.get("type")]||"#3b82f6"}],history:[{month:"Feb",value:parseFloat(fd.get("balance"))}]}]);setShowAddRetirement(false);}}>
          <Inp label="Account Name" name="name" placeholder="e.g., 401(k) - Employer" required/>
          <div className="gf2"><Sel label="Account Type" name="type" options={[{value:"401k",label:"401(k)"},{value:"roth_ira",label:"Roth IRA"},{value:"trad_ira",label:"Traditional IRA"},{value:"403b",label:"403(b)"},{value:"sep_ira",label:"SEP IRA"}]}/><Inp label="Provider" name="provider" placeholder="Fidelity" required/></div>
          <div className="gf2"><Inp label="Current Balance ($)" name="balance" type="number" step="0.01" placeholder="50000" required/><Inp label="Total Contributions ($)" name="contributions" type="number" step="0.01" placeholder="40000"/></div>
          <div className="gf2"><Inp label="Employer Match ($)" name="match" type="number" step="0.01" placeholder="0"/><Inp label="YTD Contributions ($)" name="ytd" type="number" step="0.01" placeholder="0"/></div>
          <button type="submit" style={{...bp,width:"100%",justifyContent:"center",background:"linear-gradient(135deg,#8b5cf6,#6366f1)"}}>Add Account</button>
        </form>
      </Modal>

      <Modal open={showAddOther} onClose={()=>setShowAddOther(false)} title="Add Investment / Savings">
        <form onSubmit={(e)=>{e.preventDefault();const fd=new FormData(e.target);const tp=fd.get("type");const colors={savings:"#10b981",crypto:"#f97316",cd:"#f59e0b",bonds:"#8b5cf6"};setOtherAssets((prev)=>[...prev,{id:Date.now(),name:fd.get("name"),type:tp,institution:fd.get("institution"),balance:parseFloat(fd.get("balance")),apy:fd.get("apy")?parseFloat(fd.get("apy")):null,costBasis:fd.get("cost")?parseFloat(fd.get("cost")):null,units:fd.get("units")?parseFloat(fd.get("units")):null,maturityDate:fd.get("maturity")||null,color:colors[tp]||"#6b7280"}]);setShowAddOther(false);}}>
          <Inp label="Account Name" name="name" placeholder="e.g., High-Yield Savings" required/>
          <div className="gf2"><Sel label="Type" name="type" options={[{value:"savings",label:"Savings Account"},{value:"crypto",label:"Cryptocurrency"},{value:"cd",label:"CD"},{value:"bonds",label:"Bonds"}]}/><Inp label="Institution" name="institution" placeholder="Goldman Sachs" required/></div>
          <div className="gf2"><Inp label="Current Value ($)" name="balance" type="number" step="0.01" placeholder="10000" required/><Inp label="APY (%)" name="apy" type="number" step="0.01" placeholder="4.5"/></div>
          <div className="gf2"><Inp label="Cost Basis ($)" name="cost" type="number" step="0.01" placeholder="Optional"/><Inp label="Units / Coins" name="units" type="number" step="0.0001" placeholder="Optional"/></div>
          <Inp label="Maturity Date" name="maturity" type="date"/>
          <button type="submit" style={{...bp,width:"100%",justifyContent:"center",background:"linear-gradient(135deg,#f59e0b,#d97706)"}}>Add Account</button>
        </form>
      </Modal>

      <Modal open={showAddLiability} onClose={()=>setShowAddLiability(false)} title="Add Liability">
        <form onSubmit={(e)=>{e.preventDefault();const fd=new FormData(e.target);setLiabilities((prev)=>[...prev,{id:Date.now(),name:fd.get("name"),type:fd.get("type"),balance:parseFloat(fd.get("balance")),rate:parseFloat(fd.get("rate")),monthlyPayment:parseFloat(fd.get("monthly")),originalBalance:parseFloat(fd.get("original")||fd.get("balance"))}]);setShowAddLiability(false);}}>
          <Inp label="Name" name="name" placeholder="e.g., Home Mortgage" required/>
          <div className="gf2"><Sel label="Type" name="type" options={[{value:"mortgage",label:"Mortgage"},{value:"auto",label:"Auto Loan"},{value:"student",label:"Student Loan"},{value:"credit",label:"Credit Card"}]}/><Inp label="Current Balance ($)" name="balance" type="number" step="0.01" placeholder="250000" required/></div>
          <div className="gf2"><Inp label="Interest Rate (%)" name="rate" type="number" step="0.01" placeholder="5.25" required/><Inp label="Monthly Payment ($)" name="monthly" type="number" step="0.01" placeholder="1500" required/></div>
          <Inp label="Original Balance ($)" name="original" type="number" step="0.01" placeholder="300000"/>
          <button type="submit" style={{...bp,width:"100%",justifyContent:"center",background:"linear-gradient(135deg,#ef4444,#dc2626)"}}>Add Liability</button>
        </form>
      </Modal>
    </div>
  );
}
