const { chromium } = require("playwright");

async function investigate404s() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // Arrays to collect data
  const networkErrors = [];
  const consoleErrors = [];

  // Listen for network responses
  page.on("response", (response) => {
    if (response.status() === 404) {
      networkErrors.push({
        url: response.url(),
        status: response.status(),
        method: response.request().method(),
        resourceType: response.request().resourceType(),
        headers: response.headers(),
      });
    }
  });

  // Listen for console messages
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push({
        text: msg.text(),
        type: msg.type(),
      });
    }
  });

  // Navigate to the site
  console.log("Navigating to https://www.compmasone.ru/...");
  await page.goto("https://www.compmasone.ru/", { waitUntil: "networkidle", timeout: 60000 });

  // Wait a bit more for any delayed requests
  await page.waitForTimeout(3000);

  // Get page content for context
  const title = await page.title();
  const url = page.url();

  await browser.close();

  return {
    pageTitle: title,
    finalUrl: url,
    networkErrors,
    consoleErrors,
  };
}

investigate404s()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
