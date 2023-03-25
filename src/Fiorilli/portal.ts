import { error, info, ok, sleep } from "../utils";
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
  frameUrl: string;
  page: Page;
  initialDate?: string;
  finalDate?: string;
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
  ok("Exercicio preenchido");
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

  ok("Entidade preenchida");
}

export async function disableDadosConsolidados({
  frameUrl,
  page,
}: {
  frameUrl: string;
  page: Page;
}) {
  const frameHome = page.frame({ url: new RegExp(frameUrl, "i") });
  if (!frameHome) {
    error(
      `Frame ${frameUrl} não encontrado em "disableDadosConsolidados" function`
    );
    return;
  }
  const dadosConsolidadosInput = await frameHome.waitForSelector(
    "input[id=chkMostrarDadosConsolidados]",
    { state: "attached" }
  );
  dadosConsolidadosInput?.uncheck();
  ok("Dados consolidados desabilitados");
}

export async function changeDateInterval({
  frameUrl,
  page,
  initialDate,
  finalDate,
}: changeDateIntervalProps) {
  const frameDespesasPorEntidade = page.frame({
    url: new RegExp(frameUrl, "i"),
  });

  if (frameDespesasPorEntidade && (initialDate || finalDate)) {
    initialDate = !initialDate
      ? `01/01/${finalDate?.split("/")[2]}`
      : initialDate;
    finalDate = !finalDate ? `31/12/${initialDate?.split("/")[2]}` : finalDate;
    const dataInitialSelector = "input[name=datDataInicial]";
    const datafinalSelector = "input[name=datDataFinal]";
    const elementClickSelector = "div[id=divPesqHistEmpenho]";

    info(`📅 ${initialDate} - data inicial`);
    info(`📅 ${finalDate} - data final`);

    // Data inicial
    const dataInitialInput = await frameDespesasPorEntidade.waitForSelector(
      dataInitialSelector,
      {
        state: "attached",
      }
    );
    await dataInitialInput?.fill(initialDate);
    ok(`Data inicial preenchida: ${initialDate}`);

    // Data final
    const dataFinalInput = await frameDespesasPorEntidade.waitForSelector(
      datafinalSelector,
      {
        state: "visible",
      }
    );
    await dataFinalInput?.fill(finalDate);

    ok(`Data final preenchida: ${finalDate}`);

    await (
      await frameDespesasPorEntidade.waitForSelector(elementClickSelector, {
        state: "attached",
      })
    ).click();
  }

  await sleep({ time: 2000, page });

  return frameDespesasPorEntidade;
}

export async function getTotal({
  page,
  frameUrl,
  log,
}: {
  page: Page;
  frameUrl?: string;
  log?: boolean;
}) {
  const frameDespesasPorEntidade = page.frame({
    url: new RegExp(`${frameUrl}`, "i"),
  });

  const selector =
    (await frameDespesasPorEntidade?.$("td.dxpSummary")) ||
    (await page?.$("td.dxpSummary"));

  if (!selector) {
    error("Não foi possível encontrar o total de linhas");
    return;
  }

  const RegExpMatch = (await selector.textContent())?.match(
    // eslint-disable-next-line no-useless-escape
    /(Total de linhas - )([\d\w\.]+)/
  ) as RegExpMatchArray;

  const sumario = Number(RegExpMatch[2]);

  if (log == undefined || log == true) info(`📊 Total de linhas: ${sumario}`);

  return sumario;
}

export async function getColuns(page: Page, idGrid: string) {
  await page.waitForSelector(`#${idGrid}_DXHeadersRow`, {
    state: "visible",
  });
  const colunas = await page.evaluate((idGrid: string) => {
    const childrens: any = document.querySelectorAll(
      `#${idGrid}_DXHeadersRow > td > table > tbody > tr > td`
    );
    const itens = [];
    for (let i = 0; i < childrens.length; i++) {
      itens.push(
        childrens[i].innerText
          .normalize("NFD")
          .replace(/[^a-zA-Zs]/g, "")
          .toLowerCase()
      );
    }
    return itens;
  }, idGrid);

  return colunas;
}
