import express from "express";
import { ScraperInput, ScraperInputIndeed } from "../../types/types";
import { scrapeMultiple } from "../../scraper/scraper";

const router = express.Router();

router.post("/job", async (req, res) => {
  console.log("received hit");
  const { role } = req.body;

  const result = await scrapeMultiple(role);

  res
    .status(200)
    .json({ message: "scrape finished", role: role, data: result });
});

export default router;
