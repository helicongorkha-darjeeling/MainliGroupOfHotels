import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.VISUAL_BASE_URL || "http://localhost:3001";
const output = "output/visual";
await mkdir(output, { recursive: true });
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const addDays = days => { const date = new Date(today + "T12:00:00+05:30"); date.setUTCDate(date.getUTCDate() + days); return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(date); };
const query = "checkIn=" + addDays(7) + "&checkOut=" + addDays(8) + "&guests=2";
const routes = [["home","/"],["rooms","/rooms?" + query],["teesta","/stays/teesta"],["book","/book?" + query + "&roomType=double-room"]];
const viewports = [[360,780],[390,844],[768,1024],[1024,768],[1440,900]];
const browser = await chromium.launch({ headless: true });
const results = [], errors = [];
try {
  for (const [width,height] of viewports) {
    const page = await browser.newPage({ viewport: { width,height } });
    page.on("pageerror", error => errors.push({ width, error: error.message }));
    for (const [name,path] of routes) {
      await page.goto(base + path, { waitUntil: "networkidle", timeout: 60000 });
      await page.evaluate(() => document.fonts.ready);
      if (width >= 900 && ["home","rooms","teesta"].includes(name) && !await page.locator("[data-date-trigger]").isVisible()) errors.push({name,width,booking:"Desktop date controls hidden"});
      const facts = await page.evaluate(() => {
        const small = [], root = document.querySelector(".mainali-public-page");
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode, parent = node.parentElement;
          if (!node.textContent.trim() || parent.closest("script,style,svg") || !parent.getClientRects().length) continue;
          const style = getComputedStyle(parent);
          if (style.visibility !== "hidden" && Number.parseFloat(style.fontSize) < 14) small.push({text:node.textContent.trim().slice(0,70),size:style.fontSize});
        }
        return { overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, small, images: [...document.images].filter(image => image.getClientRects().length && !image.complete).map(image => image.src) };
      });
      if (facts.overflow || facts.small.length) errors.push({name,width,...facts});
      if (name === "home" && width === 390) {
        const button = await page.locator("#check-rooms button[type=submit]").boundingBox();
        if (!button || button.y < 0 || button.y + button.height > height) errors.push({name,width,firstViewportButton:button});
      }
      if (name === "home") {
        const hero = await page.locator(".mainali-hero").boundingBox();
        const booking = await page.locator("#check-rooms").boundingBox();
        if (hero && booking && booking.y < hero.y + hero.height) errors.push({name,width,logo:"Booking panel overlaps the hero watermark"});
      }
      await page.locator('img').evaluateAll(images => Promise.all(images.map(image => { image.loading = "eager"; return image.decode().catch(() => undefined); })));
      if (await page.locator('.brand-lockup img[src*="intro"]').count()) await page.locator('.brand-lockup img[src*="intro"]').waitFor({state:"detached",timeout:8000});
      await page.screenshot({ path:output + "/" + name + "-" + width + ".png", fullPage:true });
      results.push({name,width,height,...facts});
    }
    await page.close();
  }
  const page = await browser.newPage({ viewport:{width:390,height:844} });
  await page.goto(base + "/", {waitUntil:"networkidle"});
  await page.getByRole("button",{name:"Open menu",exact:true}).click();
  if (!await page.locator(".mainali-menu").evaluate(dialog => dialog.open)) errors.push({menu:"did not open"});
  await page.keyboard.press("Escape");
  if (!await page.getByRole("button",{name:"Open menu",exact:true}).evaluate(button => button === document.activeElement)) errors.push({menu:"focus was not restored"});
  await page.locator("[data-date-trigger]").click();
  if (!await page.locator(".stay-calendar-dialog").evaluate(dialog => dialog.open)) errors.push({calendar:"did not open"});
  await page.keyboard.press("Escape");
  if (!await page.locator("[data-date-trigger]").evaluate(button => button === document.activeElement)) errors.push({calendar:"focus was not restored"});
  for (let index=0;index<12;index++) { const plus=page.getByRole("button",{name:"More guests",exact:true}); if(await plus.isEnabled()) await plus.click(); }
  if (!await page.getByRole("button",{name:"More guests",exact:true}).isDisabled()) errors.push({guests:"upper boundary"});
  for (let index=0;index<12;index++) { const minus=page.getByRole("button",{name:"Fewer guests",exact:true}); if(await minus.isEnabled()) await minus.click(); }
  if (!await page.getByRole("button",{name:"Fewer guests",exact:true}).isDisabled()) errors.push({guests:"lower boundary"});
  await page.getByRole("button",{name:"More guests",exact:true}).click();
  await page.locator("#check-rooms button[type=submit]").click();
  await page.waitForURL("**/rooms?**");
  const destination = new URL(page.url());
  if (destination.searchParams.get("guests") !== "2" || !destination.searchParams.has("checkIn") || !destination.searchParams.has("checkOut")) errors.push({search:"date/guest query was not preserved"});
  await page.goto(base + "/stays/teesta",{waitUntil:"networkidle"});
  const graphs = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.map(node => JSON.parse(node.textContent)));
  if (!graphs.some(graph => graph["@graph"]?.some(node => node["@type"] === "Hotel"))) errors.push({schema:"Hotel missing"});
  if (!graphs.some(graph => graph["@type"] === "FAQPage")) errors.push({schema:"FAQ missing"});
  await writeFile("output/property-schema.json",JSON.stringify(graphs,null,2));
  const redirect = await page.request.get(base + "/hotels/teesta",{maxRedirects:0});
  if (redirect.status() !== 308 || redirect.headers().location !== "/stays/teesta") errors.push({redirect:redirect.status(),location:redirect.headers().location});
  for (const path of ["/rooms","/book","/members","/my-bookings","/staff/login","/admin/login"]) {
    const response = await page.request.get(base + path);
    if (!response.headers()["x-robots-tag"]?.includes("noindex")) errors.push({path,noindex:"missing"});
  }
  for (const path of ["/staff/login","/admin/login"]) { await page.goto(base + path,{waitUntil:"networkidle"}); await page.screenshot({path:output + "/" + path.split("/")[1] + "-390.png",fullPage:true}); }
  await page.close();
  const nojs = await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});
  await nojs.goto(base + "/stays/teesta",{waitUntil:"networkidle"});
  if (!await nojs.locator("h1").isVisible() || !await nojs.locator(".room-comparison").isVisible() || !await nojs.locator(".hotel-faq summary").first().isVisible()) errors.push({noJS:"important hotel content hidden"});
  await nojs.screenshot({path:output+"/teesta-no-js.png",fullPage:true}); await nojs.close();
  const reduced = await browser.newPage({reducedMotion:"reduce",viewport:{width:390,height:844}});
  await reduced.goto(base+"/",{waitUntil:"networkidle"});
  if(await reduced.locator('.brand-lockup img[src*="intro"]').count()) errors.push({reducedMotion:"logo intro played"});
  await reduced.screenshot({path:output+"/home-reduced-motion.png",fullPage:true}); await reduced.close();
} finally { await browser.close(); }
await writeFile(output + "/report.json", JSON.stringify({base,results,errors},null,2));
console.log(JSON.stringify({pages:results.length,errors},null,2));
if (errors.length) process.exitCode = 1;
