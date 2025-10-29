import { BrowserContext, chromium, ElementHandle } from "playwright";
import * as cheerio from "cheerio";

import { JobInfo } from "../types/JobInfo";
import { randomUUID } from "crypto";
function _gettext($: cheerio.Root, titleEl: cheerio.Cheerio) {
  return titleEl.map((_, el) => $(el).text().trim()).get()[0];
}

async function processPnetJobCard(
  jobCard: ElementHandle<SVGElement | HTMLElement>,
  context: BrowserContext
) {
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
    const el = document.querySelector(
      "div[aria-label='registration Modal'] > button"
    );
    if (el) {
      console.log("butfound clicking it");

      (el as HTMLElement).click();
    } else {
      console.log("butn not found");
    }
  });
  const url = jobPage.url();
  const html = await jobPage.content();
  const job_info = await extractJobDataPNET(html, url);
  await jobPage.close();
  return job_info;
}
export async function scrapeIndeed(job_role: string) {
  const list_of_jobs: JobInfo[] = [];
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const mainPage = await context.newPage();
  await mainPage.goto("https://za.indeed.com/", {
    waitUntil: "domcontentloaded",
  });
  //fill in the serach bar
  await mainPage.fill(
    "#jobsearch >div >div > div > div > div >div >span > input ",
    job_role
  );
  await mainPage.click(" #jobsearch   button:last-child");
  await mainPage.waitForSelector(".jobsearch-LeftPane");
  let jobs = await mainPage.$$(
    ".jobsearch-LeftPane #mosaic-provider-jobcards ul [data-testid='slider_container']"
  );
  jobs = jobs.slice(0, 3);
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const job_html = await job.innerHTML();
    const $ = cheerio.load(job_html);
    await job.click();
    const url = mainPage.url();
    await mainPage.waitForSelector(
      "div#jobsearch-ViewjobPaneWrapper  div.jobsearch-HeaderContainer"
    );
    const html = await mainPage.content();
    const root = cheerio.load(html);
    const des = _gettext(
      root,
      root(" .jobsearch-embeddedBody #jobDescriptionText")
    );
    const job_info = await extractJobDataIndeed($, url, des);
    list_of_jobs.push(job_info);
  }
  await context.close();
  return list_of_jobs;
}
export async function scrapePnet(job_role: string) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const mainPage = await context.newPage();
  const list_of_jobs: JobInfo[] = [];
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
  let jobCards = await mainPage.$$(
    "div[data-genesis-element='CARD_GROUP_CONTAINER'] article"
  );
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
async function extractJobDataPNET(html: string, url: string) {
  const $ = cheerio.load(html);
  const job_title_text = _gettext($, $(".job-ad-display-tt0ywc h1"));
  const company_name_text = _gettext(
    $,
    $(".job-ad-display-tt0ywc > div:last-child ul li:nth-child(1)")
  );
  const company_location_text = _gettext(
    $,
    $(".job-ad-display-tt0ywc > div:last-child ul li:nth-child(2)")
  );
  const job_description = _gettext($, $(".job-ad-display-nfizss"));
  const job_id = randomUUID();
  const job_info: JobInfo = {
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
async function extractJobDataIndeed(
  $: cheerio.Root,
  url: string,
  job_description: string
) {
  const company_name_text = _gettext(
    $,
    $(" table.mainContentTable tbody tr td .company_location span")
  );

  const company_location_text = _gettext(
    $,
    $("table.mainContentTable tbody tr td [data-testid='text-location']")
  );

  const job_title_text = _gettext(
    $,
    $("table.mainContentTable tbody tr td h2 ")
  );

  const job_id = randomUUID();
  const job_info: JobInfo = {
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

export async function scrape(job_role: string, site: "INDEED" | "PNET") {
  if (site === "INDEED") {
    const list_of_jobs = await scrapeIndeed(job_role);
    return list_of_jobs;
  } else {
    const list_of_jobs = await scrapePnet(job_role);
    return list_of_jobs;
  }
}

export async function scrapeMultiple(job_role: string) {
  const all_jobs: JobInfo[] = [];
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
