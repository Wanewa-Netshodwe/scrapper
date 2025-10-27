import express from "express";
import { ScraperInput } from "../../types/types";
import { scrapeMultiple } from "../../scraper/scraper";

const router = express.Router();

router.post("/job", async (req, res) => {
  const { role } = req.body;
  
  //css selectors
  const scraperInput: ScraperInput = {
    search_box_input_selector: "input#search-key.search-input",
    search_btn_selector: "input#search-but.search-but",
    job_list_selector: "ul.job-list > li.job-list-li > ul",
    job_list_card_title_selector: "li.mag-b",
    job_list_card_brief_info_selector: "li.job-desc",
    job_list_card_job_posted_date_selector: "li.job-item",
    job_report_selector: "li#printable.job-description",
    job_report_keys_selector: ".jkey-info",
    job_report_additional_info_selector: ".job-details ul",
    apply_link_selector: "div.mag-b.bm-b-30 > a",
    url: "JOBMAG",
  };

  const result = await scrapeMultiple(role, scraperInput);

  res
    .status(200)
    .json({ message: "aight data found", role: role, data: result });
});

export default router;
