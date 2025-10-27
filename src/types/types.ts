export type optionScraperInput = Partial<ScraperInput>;

export interface ScraperInput {
  url: "JOBMAG" | "CAREERJET";
  search_box_input_selector: string;
  job_report_keys_selector: string;
  search_btn_selector: string;
  job_list_selector: string;
  job_list_card_title_selector: string;
  job_list_card_brief_info_selector: string;
  job_list_card_job_posted_date_selector: string;
  job_report_selector: string;
  job_report_additional_info_selector: string;
  apply_link_selector: string;
}

export interface MultiScrapeInput {
  sites: ScraperInput[];
}
