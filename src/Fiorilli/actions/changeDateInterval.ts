import { Frame } from "playwright-core";

export async function changeDateInterval({
  frame,
  initialDate,
  finalDate,
  log,
}: {
  frame: Frame;
  initialDate?: string;
  finalDate?: string;
  log?: boolean;
}) {
  if (frame && (initialDate || finalDate)) {
    initialDate = !initialDate
      ? `01/01/${finalDate?.split("/")[2]}`
      : initialDate;
    finalDate = !finalDate ? `31/12/${initialDate?.split("/")[2]}` : finalDate;
    const dataInitialSelector = "input[name=datDataInicial]";
    const datafinalSelector = "input[name=datDataFinal]";
    const elementClickSelector = "div[id=divPesqHistEmpenho]";

    if (log != undefined && log == true)
      console.log(`📅 ${initialDate} - data inicial`);
    if (log != undefined && log == true)
      console.log(`📅 ${finalDate} - data final`);

    // Data inicial
    const dataInitialInput = await frame.waitForSelector(dataInitialSelector, {
      state: "attached",
    });
    await dataInitialInput?.fill(initialDate);
    if (log != undefined && log == true)
      console.log(`Data inicial preenchida: ${initialDate}`);

    // Data final
    const dataFinalInput = await frame.waitForSelector(datafinalSelector, {
      state: "visible",
    });
    await dataFinalInput?.fill(finalDate);

    if (log != undefined && log == true)
      console.log(`Data final preenchida: ${finalDate}`);

    await (
      await frame.waitForSelector(elementClickSelector, {
        state: "attached",
      })
    ).click();

    await frame.page().waitForTimeout(5000);
  }

  return frame;
}
