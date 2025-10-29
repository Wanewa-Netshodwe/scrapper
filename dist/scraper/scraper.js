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
exports.scrapeIndeed = scrapeIndeed;
exports.scrapePnet = scrapePnet;
exports.scrape = scrape;
exports.scrapeMultiple = scrapeMultiple;
const playwright_1 = require("playwright");
const cheerio = __importStar(require("cheerio"));
const crypto_1 = require("crypto");
function _gettext($, titleEl) {
    return titleEl.map((_, el) => $(el).text().trim()).get()[0];
}
async function processPnetJobCard(jobCard, context) {
    const jobPagePromise = context.waitForEvent("page");
    await jobCard.click();
    const jobPage = await jobPagePromise;
    // wait for dom to load
    await jobPage.waitForEvent("domcontentloaded");
    //wait for modal to pop up
    await jobPage.waitForSelector("div[aria-label='registration Modal']", {
        state: "attached",
    });
    //close the page
    await jobPage.evaluate(() => {
        const el = document.querySelector("div[aria-label='registration Modal'] > button");
        if (el) {
            console.log("butfound clicking it");
            el.click();
        }
        else {
            console.log("butn not found");
        }
    });
    const url = jobPage.url();
    const html = await jobPage.content();
    const job_info = await extractJobDataPNET(html, url);
    await jobPage.close();
    return job_info;
}
async function scrapeIndeed(job_role) {
    const list_of_jobs = [];
    const browser = await playwright_1.chromium.launch({ headless: true });
    const context = await browser.newContext();
    const mainPage = await context.newPage();
    await mainPage.goto("https://za.indeed.com/", {
        waitUntil: "domcontentloaded",
    });
    //fill in the serach bar
    await mainPage.fill("#jobsearch >div >div > div > div > div >div >span > input ", job_role);
    await mainPage.click(" #jobsearch   button:last-child");
    await mainPage.waitForSelector(".jobsearch-LeftPane");
    let jobs = await mainPage.$$(".jobsearch-LeftPane #mosaic-provider-jobcards ul [data-testid='slider_container']");
    jobs = jobs.slice(0, 3);
    for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        const job_html = await job.innerHTML();
        const $ = cheerio.load(job_html);
        await job.click();
        const url = mainPage.url();
        await mainPage.waitForSelector("div#jobsearch-ViewjobPaneWrapper  div.jobsearch-HeaderContainer");
        const html = await mainPage.content();
        const root = cheerio.load(html);
        const des = _gettext(root, root(" .jobsearch-embeddedBody #jobDescriptionText"));
        const job_info = await extractJobDataIndeed($, url, des);
        list_of_jobs.push(job_info);
    }
    await context.close();
    return list_of_jobs;
}
async function scrapePnet(job_role) {
    const browser = await playwright_1.chromium.launch({ headless: true });
    const context = await browser.newContext();
    const mainPage = await context.newPage();
    const list_of_jobs = [];
    //search for the role
    await mainPage.goto("https://www.pnet.co.za/", {
        waitUntil: "domcontentloaded",
    });
    //accept the cookies
    await mainPage.waitForSelector("section#promptModalContainer");
    const btns = await mainPage.$$(".privacy-prompt-button");
    btns[1].click();
    //search for the desired role
    await mainPage.fill("input[data-at='searchbar-keyword-input']", job_role);
    await mainPage.click("button[aria-label='Find Jobs']");
    await mainPage.waitForURL("**/jobs/**");
    // list of job cards
    let jobCards = await mainPage.$$("div[data-genesis-element='CARD_GROUP_CONTAINER'] article");
    jobCards = jobCards.slice(0, 3);
    // loop through the first 3
    for (let i = 0; i < jobCards.length; i++) {
        const jobCard = jobCards[i];
        const job_info = await processPnetJobCard(jobCard, context);
        list_of_jobs.push(job_info);
    }
    await context.close();
    return list_of_jobs;
}
async function extractJobDataPNET(html, url) {
    const $ = cheerio.load(html);
    const job_title_text = _gettext($, $(".job-ad-display-tt0ywc h1"));
    const company_name_text = _gettext($, $(".job-ad-display-tt0ywc > div:last-child ul li:nth-child(1)"));
    const company_location_text = _gettext($, $(".job-ad-display-tt0ywc > div:last-child ul li:nth-child(2)"));
    const job_description = _gettext($, $(".job-ad-display-nfizss"));
    const job_id = (0, crypto_1.randomUUID)();
    const job_info = {
        company_location: company_location_text,
        company_name: company_name_text,
        id: job_id,
        job_description: job_description,
        scrapedFrom: "PNET",
        title: job_title_text,
        url: url,
    };
    return job_info;
}
async function extractJobDataIndeed($, url, job_description) {
    const company_name_text = _gettext($, $(" table.mainContentTable tbody tr td .company_location span"));
    const company_location_text = _gettext($, $("table.mainContentTable tbody tr td [data-testid='text-location']"));
    const job_title_text = _gettext($, $("table.mainContentTable tbody tr td h2 "));
    const job_id = (0, crypto_1.randomUUID)();
    const job_info = {
        company_location: company_location_text,
        company_name: company_name_text,
        id: job_id,
        job_description: job_description,
        scrapedFrom: "INDEED",
        title: job_title_text,
        url: url,
    };
    return job_info;
}
async function scrape(job_role, site) {
    if (site === "INDEED") {
        const list_of_jobs = await scrapeIndeed(job_role);
        return list_of_jobs;
    }
    else {
        const list_of_jobs = await scrapePnet(job_role);
        return list_of_jobs;
    }
}
async function scrapeMultiple(job_role) {
    const all_jobs = [];
    const results = await Promise.allSettled([
        scrape(job_role, "PNET"),
        scrape(job_role, "INDEED"),
    ]);
    results.forEach((result) => {
        if (result.status === "fulfilled") {
            const value = result.value;
            value.forEach((job) => {
                all_jobs.push(job);
            });
        }
    });
    return all_jobs;
}
