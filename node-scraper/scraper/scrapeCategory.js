const { autoScroll, delay } = require("./utils");
const extractDateRange = require("./extractDateRange");

module.exports = async function scrapeCategory(
  browser,
  url,
  location,
  maxEventsToScrape = null // New parameter for limiting events
) {
  const context = browser.defaultBrowserContext(); // ✅ context comes from browser
  await context.overridePermissions("https://www.airbnb.co.in", [
    "geolocation",
  ]); // or empty array if denying

  const page = await browser.newPage();

  // ✅ Set geolocation permission for the page
  await page.setGeolocation({ latitude: 0, longitude: 0 }); // dummy location

  await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });
  await delay(8000);
  await autoScroll(page);
  // Setup extended URL path based on category

  const eventLinks = await page.$$eval('a[href^="/experiences/"]', (anchors) =>
    anchors.map((a) => a.href)
  );

  const eventList = [];

  for (const [index, link] of eventLinks.entries()) {
    if (maxEventsToScrape !== null && eventList.length >= maxEventsToScrape) {
      break;
    }

    const detailPage = await browser.newPage();
    detailPage.on("console", (msg) => {
      console.log(`📜 [BROWSER LOG]: ${msg.text()}`);
    });
    console.log(`"${link}"`);
    try {
      await detailPage.goto(link, { waitUntil: "networkidle2", timeout: 0 });
      await delay(5000);

      const { availableFrom, availableTo } = await extractDateRange(detailPage);
      const mergedEventDate =
        availableFrom && availableTo
          ? `${availableFrom} - ${availableTo}`
          : "Not available";

      const data = await detailPage.evaluate(
        (loc, link, mergedEventDate) => {
          const title = document.querySelector("h1")?.innerText || "Untitled";

          // let image = Array.from(document.querySelectorAll('.i33bb1j'))
          //   .map(el => el.src)
          //   .filter(Boolean) // remove empty/null
          //   .slice(0, 4) // ✅ take only top 4

          let image =
            Array.from(document.querySelectorAll(".i33bb1j"))
              .map((el) => el.src)
              .filter(Boolean)
              .slice(0, 1)[0] || ""; // sirf ek image bhejo

          let price =
            document.querySelector(".u1dgw2qm")?.textContent.trim() || "Free";

          let eventTime = "TBD";

          // let descriptions = Array.from(
          //   document.querySelectorAll(".i17vlktb")
          // ).map((el) => el.innerText.trim());

          // let headings = Array.from(document.querySelectorAll("h3"))
          //   .slice(0, descriptions.length) // ✅ match description count
          //   .map((el) => el.innerText.trim());

          // let combined = headings.map((title, index) => {
          //   return {
          //     header: title,
          //     description: descriptions[index] || "",
          //   };
          // });

          // let combinedText = combined.map(item => `${item.header}: ${item.description}`).join("\n");

          let descriptions = Array.from(
            document.querySelectorAll(".i17vlktb")
          ).map((el) => el.innerText.trim());

          let headings = Array.from(document.querySelectorAll("h3"))
            .slice(0, descriptions.length)
            .map((el) => el.innerText.trim());

          // Agar kuch nahi mila to empty array
          let combined = [];
          if (headings.length || descriptions.length) {
            combined = headings.map((title, index) => {
              return {
                header: title,
                description: descriptions[index] || "",
              };
            });
          }

          let tags = Array.from(
  document.querySelectorAll('.l1xunq6g')
).map(el => el.textContent.trim()).filter(tag => tag.length > 0);

         let additionalImages = Array.from(document.querySelectorAll('.i33bb1j.atm_e2_1osqo2v')).map(img => img.src).filter(src => src);
          // let tags = document.querySelector('[data-ref="edp_event_category_desktop"]')?.textContent.trim() || "";
          // tags = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];

          return {
            title,
            category: "Experiences",
            eventDate: mergedEventDate,
            eventTime,
            image,
            location: loc,
            price,
            tags,
            eventLink: link,
            additionalImages,
            details: combined,
           
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
  // console.log('[DEBUG] Events collected:', eventList);
  return eventList;
};
