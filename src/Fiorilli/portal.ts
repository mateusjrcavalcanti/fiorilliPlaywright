import { Frame, Page } from "playwright-core";

interface changeExercicioProps {
  page: Page;
  exercicio: string;
}

interface changeEntidadeProps {
  page: Page;
  entidade: string;
}

interface changeDateIntervalProps {
  page: Page;
  frame: Frame;
  url: string;
  initialDate: string;
  finalDate: string;
}

export async function changeExercicio({
  page,
  exercicio,
}: changeExercicioProps) {
  const exercicioInput = await page.waitForSelector(
    "input[id=cmbExercicio_I]",
    { state: "attached" }
  );

  await page.evaluate(() => {
    const selector = document.querySelector("input[id=cmbExercicio_I]");
    selector?.removeAttribute("disabled");
    selector?.removeAttribute("readonly");
  });

  await exercicioInput?.fill(exercicio);
  await page.evaluate(() => {
    eval(`aspxETextChanged('cmbExercicio')`);
  });
  await page.waitForResponse(
    (response) =>
      response.url().includes("Home.aspx") && response.status() == 200
  );
  console.log("Exercicio preenchido");
}

export async function changeEntidade({ page, entidade }: changeEntidadeProps) {
  const entidadeInput = await page.waitForSelector(
    "input[id=cmbEntidadeContabil_I]",
    { state: "attached" }
  );
  await page.evaluate(() => {
    const selector = document.querySelector("input[id=cmbEntidadeContabil_I]");
    selector?.removeAttribute("disabled");
    selector?.removeAttribute("readonly");
  });
  await entidadeInput?.fill(entidade);
  await page.evaluate(() => {
    eval(`aspxETextChanged('cmbEntidadeContabil')`);
  });
  await page.waitForResponse(
    (response) =>
      response.url().includes("Home.aspx") && response.status() == 200
  );
  console.log("Entidade preenchida");
}

export async function disableDadosConsolidados({ frame }: { frame: Frame }) {
  const dadosConsolidadosInput = await frame.waitForSelector(
    "input[id=chkMostrarDadosConsolidados]",
    { state: "attached" }
  );
  dadosConsolidadosInput?.uncheck();
  console.log("Dados consolidados desabilitados");
}

export async function changeDateInterval({
  page,
  frame,
  url,
  initialDate,
  finalDate,
}: changeDateIntervalProps) {
  const dataInitialSelector = "input[name=datDataInicial]";
  const datafinalSelector = "input[name=datDataFinal]";
  const elementClickSelector = "div[id=divPesqHistEmpenho]";

  // Data inicial
  const dataInitialInput = await frame.waitForSelector(dataInitialSelector, {
    state: "attached",
  });
  await dataInitialInput?.fill(initialDate);
  console.log(`Data inicial preenchida: ${initialDate}`);

  await page.waitForTimeout(2000);

  // Data final
  const dataFinalInput = await frame.waitForSelector(datafinalSelector, {
    state: "visible",
  });
  await dataFinalInput?.fill(finalDate);
  console.log(`Data final preenchida: ${finalDate}`);

  await (
    await frame.waitForSelector(elementClickSelector, {
      state: "attached",
    })
  ).click();
}
