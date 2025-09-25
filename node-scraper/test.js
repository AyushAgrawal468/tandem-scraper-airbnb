const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const chalk = require('chalk');
const scrapeCategory = require('./scrapeCategory');

puppeteer.use(StealthPlugin());

const LOCATIONS = ['Delhi'];



module.exports = async function mainScraper(baseUrl) {
    const allEvents = [];

    for (const location of LOCATIONS) {
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

            for (const subCategory of subCategories) {
                const url = `https://www.airbnb.co.in/s/${location}/experiences`;
                console.log(chalk.yellow(`[INFO] Scraping: ${url}`));

                try {
                    const events = await scrapeCategory(browser, url, location);
                    allEvents.push(...events);
                } catch (err) {
                    console.error(chalk.red(`[ERROR] ${location}: ${err.message}`));
                }
            }

        await browser.close();
    }

    return allEvents;
};