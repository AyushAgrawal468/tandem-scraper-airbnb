const { autoScroll, delay } = require("./utils");
const extractDateRange = require("./extractDateRange");

module.exports = async function scrapeCategory(
  browser,
  url,
  location
) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });


  await delay(8000);


  await autoScroll(page);
  // Setup extended URL path based on category

  const eventLinks = await page.$$eval(
    'a[href^="/experiences/"]',
    (anchors) => anchors.map(a => a.href)
  );

  const eventList = [];

  for (const [index, link] of eventLinks.entries()) {

    const detailPage = await browser.newPage();
     detailPage.on("console", msg => {
          console.log(`📜 [BROWSER LOG]: ${msg.text()}`);
        });
    console.log(`"${link}"`);
    try {
      await detailPage.goto(link, { waitUntil: "networkidle2", timeout: 0 });
      await delay(5000);

      const { availableFrom, availableTo } = await extractDateRange(detailPage);
      const mergedEventDate = availableFrom && availableTo
              ? `${availableFrom} - ${availableTo}`
              : "Not available";

      const data = await detailPage.evaluate(
        (loc,link,mergedEventDate) => {
          const title = document.querySelector("h1")?.innerText || "Untitled";

          let image = Array.from(document.querySelectorAll('.i33bb1j'))
            .map(el => el.src)
            .filter(Boolean) // remove empty/null
            .slice(0, 4) // ✅ take only top 4
          let price = document.querySelector('u1dgw2qm')?.textContent.trim() || "Free";

          let eventTime = "TBD";
          let descriptions = Array.from(document.querySelectorAll(".i17vlktb"))
            .map(el => el.innerText.trim());

          let headings = Array.from(document.querySelectorAll("h3"))
            .slice(0, descriptions.length) // ✅ match description count
            .map(el => el.innerText.trim());

          let combined = headings.map((title, index) => {
            return {
              header: title,
              description: descriptions[index] || ""
            };
          });

          return {
            title,
            category: "Experiences",
            eventDate:mergedEventDate,
            eventTime,
            image,
            location: loc,
            price,
            eventLink: link,
            details: combined
          };
        },
        location,
        link,
        mergedEventDate
      );
      eventList.push(data);
    } catch (e) {
      console.error(`❌ Error scraping ${link}: ${e.message}`);
    } finally {
      await detailPage.close();
    }
  }

  await page.close();
  return eventList;
};
