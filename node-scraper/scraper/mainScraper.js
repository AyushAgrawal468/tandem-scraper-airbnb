const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const chalk = require('chalk');
const scrapeCategory = require('./scrapeCategory');

puppeteer.use(StealthPlugin());

const LOCATIONS = ['Delhi'];
const subCategories = ['experiences'];

module.exports = async function mainScraper(baseUrl) {
    const allEvents = [];
    const maxEvents = 3; // Set to null for unlimited

    console.log(chalk.cyan.bold(`\n🚀 [START] Airbnb scraper`));
    console.log(chalk.cyan(`🌐 Base URL: ${baseUrl}`));
    console.log(chalk.cyan(`📍 Locations: ${LOCATIONS.join(', ')}`));
    console.log(chalk.cyan(`📂 Categories: ${subCategories.join(', ')}`));
    console.log(chalk.cyan(`🎯 Max events: ${maxEvents ?? 'Unlimited'}`));
    console.log("────────────────────────────────────────────");

    for (const location of LOCATIONS) {
        if (maxEvents !== null && allEvents.length >= maxEvents) break;

        console.log(chalk.yellow.bold(`\n📍 Starting location: ${location}`));

        const browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,              // 🔴 critical: disables 800×600 viewport
            args: [
                '--start-maximized',              // 🔴 full screen
                '--window-size=1920,1080',         // 🔴 force desktop layout
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });

        console.log(chalk.green(`🧭 Browser launched for ${location}`));

        for (const subCategory of subCategories) {
            if (maxEvents !== null && allEvents.length >= maxEvents) break;

            const url = `https://www.airbnb.co.in/s/${location}/${subCategory}`;
            console.log(chalk.blue(`\n🔎 Scraping category: ${subCategory}`));
            console.log(chalk.gray(`🔗 URL: ${url}`));

            try {
                const remainingSlots =
                    maxEvents === null ? null : maxEvents - allEvents.length;

                console.log(chalk.gray(`📦 Slots remaining: ${remainingSlots ?? '∞'}`));

                const events = await scrapeCategory(browser, url, location, remainingSlots);

                console.log(chalk.green(`✅ ${events.length} events fetched for ${location} → ${subCategory}`));

                allEvents.push(...events);

                console.log(chalk.magenta(`📊 Total collected so far: ${allEvents.length}`));

                if (maxEvents !== null && allEvents.length >= maxEvents) {
                    console.log(chalk.yellow.bold(`🛑 Reached maxEvents (${maxEvents}). Stopping.`));
                    break;
                }
            } catch (err) {
                console.error(chalk.red(`❌ Failed ${location} → ${subCategory}`));
                console.error(chalk.red(err.stack || err.message));
            }
        }

        await browser.close();
        console.log(chalk.blue(`🧹 Browser closed for ${location}`));
    }

    console.log("\n────────────────────────────────────────────");
    console.log(chalk.green.bold(`🎉 Scraping complete`));
    console.log(chalk.green(`📦 Total events collected: ${allEvents.length}`));

    return allEvents;
};
