import { auth } from "./config";

const FUNCTION_URLS = {
  propertyData: "https://propertydata-jodnax35dq-uc.a.run.app",
  marketData: "https://marketdata-jodnax35dq-uc.a.run.app",
  comparables: "https://comparables-jodnax35dq-uc.a.run.app",
};

async function callFunction(endpoint, params) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");
  const token = await user.getIdToken();
  const url = new URL(FUNCTION_URLS[endpoint]);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.append(k, v);
  });
  const res = await fetch(url.toString(), { headers: { Authorization: "Bearer " + token } });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "API error " + res.status);
  }
  return res.json();
}

export async function fetchPropertyData(address, city, state, zipCode) {
  return callFunction("propertyData", { address, city, state, zipCode });
}

export async function fetchMarketData(zipCode) {
  return callFunction("marketData", { zipCode });
}

export async function fetchComparables(params) {
  return callFunction("comparables", params);
}

export async function fetchFullPropertyAnalysis(address, city, state, zipCode, bedrooms) {
  const results = { property: null, valuation: null, rent: null, market: null, comparables: null, errors: [] };
  try {
    const propData = await fetchPropertyData(address, city, state, zipCode);
    results.property = propData.property || null;
    results.valuation = propData.valuation || null;
    results.rent = propData.rent || null;
  } catch (e) { results.errors.push("Property: " + e.message); }
  try { results.market = await fetchMarketData(zipCode); } catch (e) { results.errors.push("Market: " + e.message); }
  try { results.comparables = await fetchComparables({ zipCode, state, bedrooms: bedrooms || undefined, limit: 8 }); } catch (e) { results.errors.push("Comps: " + e.message); }
  return results;
}
