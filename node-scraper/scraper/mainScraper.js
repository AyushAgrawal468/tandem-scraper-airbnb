const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const chalk = require('chalk');
const axios = require('axios');
const scrapeCategory = require('./scrapeCategory');

puppeteer.use(StealthPlugin());

const LOCATIONS = ['Delhi'];
const subCategories = ['experiences'];

module.exports = async function mainScraper(baseUrl, callbackUrl) {
    const seenLinks = new Set();

    console.log(chalk.cyan(`[START] Starting mainScraper with baseUrl: ${baseUrl}`));

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    console.log(chalk.green(`[BROWSER] Browser launched`));

    try {
        for (const location of LOCATIONS) {
            console.log(chalk.cyan(`[INFO] Starting location: ${location}`));

            for (const subCategory of subCategories) {
                const url = `https://www.airbnb.co.in/s/${location}/${subCategory}`;
                console.log(chalk.yellow(`[SCRAPE] Scraping subCategory: ${subCategory} | URL: ${url}`));

                try {
                    const events = await scrapeCategory(browser, url, location, null);

                    const unique = events.filter(e => {
                        if (!e.eventLink || seenLinks.has(e.eventLink)) return false;
                        seenLinks.add(e.eventLink);
                        return true;
                    });

                    if (!unique.length) continue;

                    await axios.post(callbackUrl, unique, { timeout: 10_000 });
                    console.log(chalk.green(`[✓] Sent ${unique.length} events for ${location} - ${subCategory} to callback`));

                } catch (err) {
                    console.error(chalk.red(`[ERROR] Failed scraping ${location} - ${subCategory}: ${err.stack || err.message}`));
                }
            }
        }
    } finally {
        await browser.close();
        console.log(chalk.blue(`[BROWSER] Browser closed`));
    }

    console.log(chalk.magenta(`[COMPLETE] Scraping finished. Total unique events sent: ${seenLinks.size}`));
};
