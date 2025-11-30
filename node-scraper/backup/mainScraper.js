const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const chalk = require('chalk');
const scrapeCategory = require('./scrapeCategory');

puppeteer.use(StealthPlugin());

const LOCATIONS = ['Delhi'];
// ⚠️ subCategories is not defined in your snippet — make sure to declare it or remove the loop
const subCategories = ['experiences']; // Example placeholder

module.exports = async function mainScraper(baseUrl) {
    const allEvents = [];

    console.log(chalk.cyan(`[START] Starting mainScraper with baseUrl: ${baseUrl}`));

    for (const location of LOCATIONS) {
        console.log(chalk.cyan(`[INFO] Starting location: ${location}`));

        const browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        console.log(chalk.green(`[BROWSER] Browser launched for location: ${location}`));

        for (const subCategory of subCategories) {
            const url = `https://www.airbnb.co.in/s/${location}/${subCategory}`;
            console.log(chalk.yellow(`[SCRAPE] Scraping subCategory: ${subCategory} | URL: ${url}`));

            try {
                const events = await scrapeCategory(browser, url, location);
                console.log(chalk.green(`[SUCCESS] Fetched ${events.length} events for ${location} - ${subCategory}`));
                allEvents.push(...events);
            } catch (err) {
                console.error(chalk.red(`[ERROR] Failed scraping ${location} - ${subCategory}: ${err.stack || err.message}`));
            }
        }

        await browser.close();
        console.log(chalk.blue(`[BROWSER] Browser closed for location: ${location}`));
    }

    console.log(chalk.magenta(`[COMPLETE] Scraping finished. Total events collected: ${allEvents.length}`));

    return allEvents;
};
