"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const scraper_1 = require("../../scraper/scraper");
const router = express_1.default.Router();
router.post("/job", async (req, res) => {
    console.log("received hit");
    const { role } = req.body;
    const result = await (0, scraper_1.scrapeMultiple)(role);
    res
        .status(200)
        .json({ message: "scrape finished", role: role, data: result });
});
exports.default = router;
