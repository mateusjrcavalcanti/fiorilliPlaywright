import { promises as fs } from "fs";
import chalk from "chalk";
import { Page } from "playwright-core";

export const fileExists = async (path: string) =>
  !!(await fs.stat(path).catch((e) => false));

export function title(text: string) {
  console.log(`${chalk.bgYellow.white(text.toUpperCase())}`);
}

export function ok(text: string) {
  console.log(`✅ ${chalk.green(text)}`);
}

export function error(text: string) {
  console.log(`❌ ${chalk.red(text)}`);
}

export function info(text: string) {
  console.log(`${chalk.blue(text)}`);
  return true;
}

export function infoTitle(text: string) {
  console.log(`${chalk.bgBlue(text)}`);
}

export async function agora() {
  const agora = new Date();
  return `${agora.getHours()}:${agora.getMinutes()}:${agora.getSeconds()}`;
}

export async function sleep({ time, page }: { time: number; page: Page }) {
  console.log(
    `🌙 ${await agora()} ${chalk.cyan("Dormindo por " + time / 1000 + "s")}`
  );
  await page.waitForTimeout(time);
  // return new Promise((resolve) => {
  //   setTimeout(resolve, time);
  // });
  console.log(`🌞 ${await agora()}`);
}

export async function blockRequests({
  page,
  logs = false,
}: {
  page: Page;
  logs?: boolean;
}) {
  // - stylesheet
  // - image
  // - media
  // - font
  // - script
  // - texttrack
  // - xhr
  // - fetch
  // - eventsource
  // - websocket
  // - manifest
  // - other
  const RESOURCE_EXCLUSTIONS = [
    "image",
    "stylesheet",
    "media",
    "font",
    "other",
  ];
  await page.route("**/*", (route) => {
    return RESOURCE_EXCLUSTIONS.includes(route.request().resourceType())
      ? (!logs ||
          info(
            `${route.request().url()} [${route
              .request()
              .resourceType()
              .toUpperCase()}]`
          )) &&
          route.abort()
      : route.continue();
  });
}
