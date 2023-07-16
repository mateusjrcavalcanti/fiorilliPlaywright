import { Frame } from "playwright-core";

export async function disableDadosConsolidados({ frame }: { frame: Frame }) {
  await frame.locator("input[id=chkMostrarDadosConsolidados]").uncheck();

  // await frame
  //   .page()
  //   .waitForResponse(
  //     (response) =>
  //       response.url().endsWith(frame.url().split("/").pop() as string) &&
  //       response.status() === 200 &&
  //       response.request().resourceType() === "xhr"
  //   );

  await frame.waitForTimeout(5000); //TODO: remove this

  console.log("Dados consolidados desabilitados");
}
