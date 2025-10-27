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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartScrape = StartScrape;
exports.parseDataJobCoverPage = parseDataJobCoverPage;
exports.scrape = scrape;
exports.scrapeMultiple = scrapeMultiple;
const playwright_1 = require("playwright");
const cheerio = __importStar(require("cheerio"));
const crypto_1 = require("crypto");
function _gettext($, titleEl) {
    return titleEl.map((_, el) => $(el).text().trim()).get()[0];
}
// i keep track of the current job processed
const jobsInfoExtractInProgress = {};
//jobs queue
const jobsProccesed = [];
const job_urls = [
    "https://www.myjobmag.co.za/",
    "https://www.careerjet.co.za/",
];
async function StartScrape(job_role, scraperInput) {
    const url = scraperInput.url === "JOBMAG" ? job_urls[0] : job_urls[1];
    // show ui
    const browser = await playwright_1.chromium.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.fill(scraperInput.search_box_input_selector, job_role);
    await page.click(scraperInput.search_btn_selector);
    await page.waitForTimeout(4000);
    // i get the string version of the html
    const html = await page.content();
    //extract cover job data
    parseDataJobCoverPage(html, scraperInput);
    // click through the job cards
    const job_cards = await page.locator(scraperInput.job_list_selector).all();
    for (let i = 0; i < 3; i++) {
        const card = job_cards[i];
        const job_link = await card.locator("li.mag-b h2");
        console.log(job_link);
        if (i !== 0) {
            await Promise.all([page.waitForURL("**/job/**"), job_link.click()]);
        }
        // there is an ad  that pops up this for disabling the ad
        if (i === 0) {
            console.log("im about to click");
            await job_link.click();
            console.log("i clicked");
            const ads = await page.$$("ins.adsbygoogle");
            if (ads.length > 8) {
                console.log("Ad popped up, hiding it");
                await page.evaluate(() => {
                    const el = document.querySelectorAll("ins.adsbygoogle")[8];
                    //@ts-ignore
                    if (el)
                        el.style.display = "none";
                });
                await Promise.all([page.waitForURL("**/job/**"), job_link.click()]);
                const html = await page.content();
                parseDataJobNestedPage(html, scraperInput);
                await page.goBack();
                continue;
            }
        }
        const html = await page.content();
        // extract the nested  job info
        parseDataJobNestedPage(html, scraperInput);
        await page.goBack();
    }
    await browser.close();
    return html;
}
function _helperExtractJobCardInfo($, jobs, scraperInput) {
    jobs.map((_, el) => {
        const card = $(el);
        const titleEl = card.find(scraperInput.job_list_card_title_selector);
        const title = _gettext($, titleEl);
        const descEl = card.find(scraperInput.job_list_card_brief_info_selector);
        const desc = _gettext($, descEl);
        const postedDateUl = card.find(scraperInput.job_list_card_job_posted_date_selector);
        const postedDateEl = postedDateUl.find("li#job-date");
        const postedDateText = _gettext($, postedDateEl);
        const job_id = (0, crypto_1.randomUUID)();
        const job_info = {
            id: job_id,
            cover_page: {
                job_brief_info: desc,
                job_posted_date: postedDateText,
                job_title: title,
            },
        };
        jobsInfoExtractInProgress[job_info.id] = job_info;
        jobsProccesed.push(job_id);
    });
}
function parseDataJobCoverPage(html, scraperInput) {
    const $ = cheerio.load(html);
    const jobs = $(scraperInput.job_list_selector).slice(0, 3);
    _helperExtractJobCardInfo($, jobs, scraperInput);
}
function parseDataJobNestedPage(html, scraperInput) {
    const jobId = jobsProccesed.shift();
    if (jobId === undefined) {
        return;
    }
    const jobInfo = jobsInfoExtractInProgress[jobId];
    const $ = cheerio.load(html);
    const job_report_el = $(scraperInput.job_report_selector);
    _helperparseDataJobNestedPage($, job_report_el, jobInfo, scraperInput);
    const div_apply = $(scraperInput.apply_link_selector);
    const jbInfo = jobsInfoExtractInProgress[jobId];
    jbInfo.job_apply_link = extractLink($, div_apply);
}
function extractLink($, div_apply) {
    const link = div_apply
        .map((_, a) => {
        return $(a).attr("href");
    })
        .get();
    return link[0];
}
function _helperparseDataJobNestedPage($, job_report, JobInfo, scraperInput) {
    job_report.map((_, el) => {
        const job_key_info = $(el)
            .find(scraperInput.job_report_keys_selector)
            .map((_, a) => $(a).text().trim())
            .get();
        const allLists = $(scraperInput.job_report_additional_info_selector)
            .map((_, el) => {
            const items = $(el)
                .find("li")
                .map((_, li) => $(li).text().trim())
                .get();
            return items;
        })
            .get();
        const all_info = allLists.flat().join("\n");
        const job_info = {
            ...JobInfo,
            nested_page: {
                job_additional_info: all_info,
                job_qualification: job_key_info[1],
                job_experince: job_key_info[2].length > 1 ? job_key_info[2] : "not required",
                job_location: job_key_info[3],
                job_city: job_key_info[4],
            },
        };
        jobsInfoExtractInProgress[job_info.id] = job_info;
    });
}
async function scrape(job_role, scraperInput) {
    const html = await StartScrape(job_role, scraperInput);
    const jobs_info = Object.values(jobsInfoExtractInProgress);
    return jobs_info;
}
async function scrapeMultiple(job_role, scraperInput) {
    const urls = scraperInput.url === "JOBMAG" ? [`${job_urls[0]}`] : [`${job_urls[1]}`];
    const results = await Promise.all(urls.map(async (site) => {
        try {
            const data = await scrape(job_role, scraperInput);
            return { url: site, data };
        }
        catch (err) {
            console.error(`Failed to scrape ${site}`, err);
            return { url: site, data: [] };
        }
    }));
    return results;
}
