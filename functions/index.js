const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const cors = require("cors")({ origin: true });

admin.initializeApp();

// ═══════════════════════════════════════════════════════════
// RentCast API Key — set via Firebase CLI:
//   firebase functions:config:set rentcast.apikey="YOUR_KEY"
// ═══════════════════════════════════════════════════════════
const getApiKey = () => {
  return process.env.RENTCAST_API_KEY || "";
};

const RENTCAST_BASE = "https://api.rentcast.io/v1";

// Helper: call RentCast API
async function callRentCast(endpoint, params) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("RentCast API key not configured");

  const url = new URL(`${RENTCAST_BASE}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.append(k, v);
    }
  });

  const res = await fetch(url.toString(), {
    headers: { "X-Api-Key": apiKey, Accept: "application/json" },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RentCast API error ${res.status}: ${text}`);
  }

  return res.json();
}

// Helper: verify Firebase auth
async function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized");
  }
  const token = authHeader.split("Bearer ")[1];
  return admin.auth().verifyIdToken(token);
}

// ═══════════════════════════════════════════════════════════
// ENDPOINT 1: Property Valuation + Details
// GET /propertyData?address=123 Main St&city=Denver&state=CO&zipCode=80202
// Returns: property details, value estimate, rent estimate, comparables
// ═══════════════════════════════════════════════════════════
exports.propertyData = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      await verifyAuth(req);

      const { address, city, state, zipCode } = req.query;
      if (!address) {
        return res.status(400).json({ error: "Address is required" });
      }

      const params = { address, city, state, zipCode };
      const results = {};

      // 1. Property records (details, sqft, beds, baths, etc.)
      try {
        const records = await callRentCast("/properties", params);
        if (Array.isArray(records) && records.length > 0) {
          results.property = records[0];
        }
      } catch (e) {
        results.propertyError = e.message;
      }

      // 2. Value estimate (AVM)
      try {
        const valuation = await callRentCast("/avm/value", params);
        results.valuation = valuation;
      } catch (e) {
        results.valuationError = e.message;
      }

      // 3. Rent estimate
      try {
        const rent = await callRentCast("/avm/rent/long-term", params);
        results.rent = rent;
      } catch (e) {
        results.rentError = e.message;
      }

      return res.json(results);
    } catch (err) {
      console.error("propertyData error:", err);
      return res.status(err.message === "Unauthorized" ? 401 : 500).json({
        error: err.message,
      });
    }
  });
});

// ═══════════════════════════════════════════════════════════
// ENDPOINT 2: Market Statistics
// GET /marketData?zipCode=80202
// Returns: median prices, days on market, inventory, trends
// ═══════════════════════════════════════════════════════════
exports.marketData = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      await verifyAuth(req);

      const { zipCode } = req.query;
      if (!zipCode) {
        return res.status(400).json({ error: "Zip code is required" });
      }

      const data = await callRentCast("/markets", {
        zipCode,
        dataType: "All",
        historyRange: 12,
      });

      return res.json(data);
    } catch (err) {
      console.error("marketData error:", err);
      return res.status(err.message === "Unauthorized" ? 401 : 500).json({
        error: err.message,
      });
    }
  });
});

// ═══════════════════════════════════════════════════════════
// ENDPOINT 3: Sale Listings (Comparables)
// GET /comparables?zipCode=80202&bedrooms=3&status=Active
// Returns: nearby listings for comparison
// ═══════════════════════════════════════════════════════════
exports.comparables = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      await verifyAuth(req);

      const { zipCode, city, state, bedrooms, bathrooms, status, limit } = req.query;
      if (!zipCode && !city) {
        return res.status(400).json({ error: "Zip code or city is required" });
      }

      const data = await callRentCast("/listings/sale", {
        zipCode,
        city,
        state,
        bedrooms,
        bathrooms,
        status: status || "Active",
        limit: limit || 10,
      });

      return res.json(data);
    } catch (err) {
      console.error("comparables error:", err);
      return res.status(err.message === "Unauthorized" ? 401 : 500).json({
        error: err.message,
      });
    }
  });
});
