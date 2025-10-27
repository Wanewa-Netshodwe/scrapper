"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const scraper_1 = require("./scraper");
const app = (0, express_1.default)();
const PORT = 3000;
app.use(body_parser_1.default.json());
// Multi-site scraping endpoint
app.post("/scrape-multi", async (req, res) => {
  const input = req.body;
  if (!input.sites || !Array.isArray(input.sites) || input.sites.length === 0) {
    return res.status(400).json({ error: "Invalid sites array" });
  }
  try {
    const results = await (0, scraper_1.scrapeMultiple)(input.sites);
    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to scrape sites" });
  }
});
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
