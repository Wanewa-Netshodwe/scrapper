import express from "express";
import cors from "cors";
import scrapeRoute from "./routes/jobScrape";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({ origin: "*" }));

app.use("/api/scrape", scrapeRoute);

app.listen(4500, () => {
  console.log(`server is running on port 4500`);
});
