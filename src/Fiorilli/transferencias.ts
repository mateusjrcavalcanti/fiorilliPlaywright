import moment from "moment";
import { Page, chromium, BrowserContext } from "playwright-core";
import { blockRequests, infoTitle, ok, sleep, title } from "../utils";

import {
  changeExercicio,
  changeEntidade,
  disableDadosConsolidados,
  changeDateInterval,
  getTotal,
  getColuns,
  tratamento,
} from "./portal";

interface getTransferenciasProps {
  initialDate?: string;
  finalDate?: string;
  entidade: string;
  exercicio: string;
  pageUrl: string;
}

interface acessTransferenciasProps {
  page: Page;
}

export async function getTransferencias({
  finalDate,
  pageUrl,
  entidade,
  exercicio,
}: getTransferenciasProps) {
  const inicio = moment.now();
  title(`Despesas Extras`);
  const browser = await chromium.launch({ headless: false, devtools: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  await blockRequests({ page });
  await page.goto(pageUrl);

  // Change exercicio e entidade
  await changeExercicio({ page, exercicio });
  await changeEntidade({ page, entidade });

  // Wait for page load
  await sleep({ time: 4000, page });

  // Acess page despesas gerais
  await acessPageTransferencias({ page });

  // Disable dados consolidados
  await disableDadosConsolidados({ frameUrl: ".*/Home.aspx*", page });

  //await sleep({ time: 10000, page });
  //await page.waitForLoadState("networkidle");

  await changeDateInterval({
    frameUrl: ".*/TransferenciasPorEntidade.aspx*",
    finalDate,
    page,
  });

  const total = await getTotal({
    page,
    frameUrl: ".*/TransferenciasPorEntidade.aspx*",
  });

  if (!total) return;

  await getAllTransferencias({ context, page, total });

  await browser.close();
  infoTitle(
    `Tempo total: ${moment.duration(moment.now() - inicio).humanize()}`
  );
}

async function acessPageTransferencias({ page }: acessTransferenciasProps) {
  await page.evaluate(() => {
    eval(`ProcessaDados('LnkTransf')`);
  });
  await page.waitForResponse(
    (response) =>
      response.url().includes("TransferenciasPorEntidade.aspx") &&
      response.status() == 200
  );

  ok("Página de despesas extras acessada");
}

async function getAllTransferencias({
  context,
  page,
  total,
}: {
  context: BrowserContext;
  page: Page;
  total: number;
}) {
  const url = page.url();
  await page.goto(
    `${url}TransferenciasPorEntidade.aspx?bolMostraDadosConsolidados=N`,
    {
      waitUntil: "networkidle",
    }
  );
  const colunas = await getColuns(page, "gridTransferencias");

  await getTransferencia({ page, colunas });
}

async function getTransferencia({
  page,
  colunas,
}: {
  page: Page;
  colunas: string[];
}) {
  await page.waitForLoadState("networkidle");
  const linhas = await page.$$eval(
    `#gridTransferencias_DXMainTable > tbody > tr.dxgvDataRow`,
    (elements: any) => {
      const linhas: any[] = [];
      elements.map((el: any) => {
        const linha: any[] = [];
        Array.from(el.children).map((col: any) => linha.push(col.innerText));
        linhas.push(linha);
      });
      return linhas;
    }
  );
  save({ receitas: linhas, colunas });
  if (
    await page.evaluate(
      () => document.querySelectorAll("img.dxWeb_pNext").length
    )
  ) {
    await page.evaluate(() =>
      eval(`aspxGVPagerOnClick('gridTransferencias','PBN');`)
    );
    await page.waitForResponse(
      (response) =>
        response.url().includes("TransferenciasPorEntidade.aspx") &&
        response.status() == 200
    );
    await page.evaluate(() => eval("AtualizarGrid()"));
    await getTransferencia({
      page,
      colunas,
    });
  }
}

export async function save({
  receitas,
  colunas,
}: {
  receitas: any[];
  colunas: string[];
}) {
  const inserts = receitas.map(async (receita) => {
    const obj = {} as any;
    colunas.forEach(
      (coluna) => (obj[coluna] = receita[colunas.indexOf(coluna)])
    );
    return tratamento(obj);
  });
  console.log(inserts);
}
