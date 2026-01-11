const { autoScroll, delay } = require("./utils");
const extractDateRange = require("./extractDateRange");

module.exports = async function scrapeCategory(
  browser,
  url,
  location,
  maxEventsToScrape = null
) {
  const context = browser.defaultBrowserContext();
  await context.overridePermissions("https://www.airbnb.co.in", ["geolocation"]);

  const page = await browser.newPage();
  await page.setGeolocation({ latitude: 0, longitude: 0 });

  console.log(`🌍 Opening category page: ${url}`);
  await page.goto(url, { waitUntil: "networkidle2", timeout: 0 });
  await delay(8000);
  await autoScroll(page);

  const eventLinks = await page.$$eval('a[href^="/experiences/"]', anchors =>
    [...new Set(anchors.map(a => a.href))]
  );

  console.log(`🔗 Found ${eventLinks.length} experience links`);

  const eventList = [];

  for (const [index, link] of eventLinks.entries()) {
    if (maxEventsToScrape !== null && eventList.length >= maxEventsToScrape) {
      console.log(`⏹ Reached maxEventsToScrape=${maxEventsToScrape}`);
      break;
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📌 [${index + 1}/${eventLinks.length}] Opening: ${link}`);

    const detailPage = await browser.newPage();

    try {
      await detailPage.goto(link, { waitUntil: "networkidle2", timeout: 0 });
      await delay(5000);

      const data = await detailPage.evaluate((loc, link) => {
        const title = document.querySelector("h1")?.innerText.trim() || "Untitled";

        const additionalImages = Array.from(document.querySelectorAll('img[alt^="Photo"]'))
          .map(img => img.src)
          .filter(Boolean)
          .slice(0, 4);

        const image = additionalImages.slice(0, 1)[0] || "";

        const eventDateRange = Array.from(
          document.querySelectorAll('a[href^="/book/experiences"]')
        ).map(booking => {
          const rows = Array.from(booking.querySelectorAll(':scope > div'))
            .map(d => d.innerText.trim())
            .filter(t => t.length > 0);

          const date = rows[0] || "";
          const time = rows[1] || "";

          return time ? `${date} ${time}` : date;
        }).filter(Boolean);


        const eventDate = eventDateRange?.[0] || "TBD";


        const price = document
          .querySelector('span[style*="--pricing-guest-primary-line-unit-price-text-decoration"]')
          ?.innerText.trim() || "Free";


        const eventTime = "TBD";

        const description = (() => {
          const seen = new Set();

          return Array.from(
            document.querySelectorAll('div[style*="background-image"]')
          )
            .map(imgDiv => {
              let container = imgDiv;
              while (container && !container.querySelector('h3[tabindex="-1"]')) {
                container = container.parentElement;
              }
              if (!container) return null;

              const h3 = container.querySelector('h3[tabindex="-1"]');
              const desc = h3?.nextElementSibling;
              if (!h3 || !desc) return null;

              const text = `${h3.innerText.trim()}\n${desc.innerText.trim()}`;

              if (seen.has(text)) return null;   // 🔴 Deduplicate by content
              seen.add(text);

              return text;
            })
            .filter(Boolean);
        })();




        const tags = Array.from(document.querySelectorAll('.l1xunq6g'))
          .map(el => el.textContent.trim())
          .filter(Boolean);

        return {
          title,
          category: "Experiences",
          eventDate,
          eventTime,
          additionalImages,
          image,
          location: loc,
          price,
          tags,
          eventLink: link,
          description,
          eventDateRange
        };
      }, location, link);

      console.log(`🎉 Scraped: ${data.title}`);
      console.log(`🖼 Images: ${data.additionalImages.length}`);
      console.log(`🏷 Tags: ${data.tags.join(", ") || "NONE"}`);
      console.log(`💰 Price: ${data.price}`);
      console.log(`📍 Location: ${data.location}`);
      console.log(`📍 Event Date: ${data.eventDate}`);
      eventList.push(data);

    } catch (e) {
      console.error(`❌ Failed ${link}: ${e.message}`);
    } finally {
      await detailPage.close();
    }
  }

  await page.close();

  console.log(`\n✅ Total events scraped: ${eventList.length}`);
  return eventList;
};
