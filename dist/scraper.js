"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchHtml = fetchHtml;
exports.parseData = parseData;
exports.scrape = scrape;
exports.scrapeMultiple = scrapeMultiple;
const playwright_1 = require("playwright");
const cheerio = __importStar(require("cheerio"));
const ioredis_1 = __importDefault(require("ioredis"));
const redis = new ioredis_1.default(); // default localhost:6379
const CACHE_TTL = 300; // seconds
async function fetchHtml(url) {
    const browser = await playwright_1.chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    const html = await page.content();
    await browser.close();
    return html;
}
function parseData(html, selector) {
    const $ = cheerio.load(html);
    return $(selector)
        .map((_, el) => $(el).text().trim())
        .get();
}
async function scrape({ url, selector, }) {
    const cacheKey = `scrape:${url}:${selector}`;
    const cached = await redis.get(cacheKey);
    if (cached)
        return JSON.parse(cached);
    const html = await fetchHtml(url);
    const data = parseData(html, selector);
    await redis.set(cacheKey, JSON.stringify(data), "EX", CACHE_TTL);
    return data;
}
async function scrapeMultiple(sites) {
    const results = await Promise.all(sites.map(async (site) => {
        try {
            const data = await scrape(site);
            return { url: site.url, data };
        }
        catch (err) {
            console.error(`Failed to scrape ${site.url}`, err);
            return { url: site.url, data: [] };
        }
    }));
    return results.reduce((acc, curr) => {
        acc[curr.url] = curr.data;
        return acc;
    }, {});
}
