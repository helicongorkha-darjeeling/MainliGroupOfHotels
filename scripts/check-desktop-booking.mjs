import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({viewport:{width:1280,height:900}});
try {
  for (const route of ["/stays/teesta","/rooms"]) {
    await page.goto((process.env.VISUAL_BASE_URL || "http://localhost:3001") + route,{waitUntil:"networkidle"});
    if(!await page.locator("[data-date-trigger]").isVisible()) throw new Error("Desktop booking date trigger is hidden on " + route);
  }
  console.log("Desktop booking controls visible on both routes.");
} finally { await browser.close(); }
