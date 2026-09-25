const { chromium } = require("playwright");

async function investigateDeeper() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const networkErrors = [];
  const allResponses = [];

  page.on("response", (response) => {
    allResponses.push({
      url: response.url(),
      status: response.status(),
      method: response.request().method(),
      resourceType: response.request().resourceType(),
      contentType: response.headers()["content-type"],
    });
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

  await page.goto("https://www.compmasone.ru/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(3000);

  // Get the page HTML to see what scripts it's trying to load
  const html = await page.content();

  // Look for script tags and their src attributes
  const scriptMatches = html.match(/<script[^>]*src=["']([^"']+)["']/g) || [];
  const linkMatches = html.match(/<link[^>]*href=["']([^"']+)["']/g) || [];

  await browser.close();

  return {
    networkErrors: networkErrors.length,
    allResponses: allResponses.filter((r) => r.status !== 200),
    scriptTags: scriptMatches,
    linkTags: linkMatches,
    htmlPreview: html.substring(0, 5000),
  };
}

investigateDeeper()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
