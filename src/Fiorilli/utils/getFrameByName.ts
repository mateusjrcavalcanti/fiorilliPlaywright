import { Page } from "playwright-core";

export const getFrameByName = async ({
  page,
  name,
}: {
  page: Page;
  name: string;
}) => {
  return (
    page.frames().find((frame) => frame.name() === name) || page.frames()[1]
  );
};
