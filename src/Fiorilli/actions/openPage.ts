import { chromium } from "playwright-core";

type Props = {
  url: string;
};

export async function openPage({ url }: Props) {
  const browser = await chromium.launch({ headless: true, devtools: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(url);

  return page;
}
