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
} from "./portal";

interface getReceitasProps {
  initialDate?: string;
  finalDate?: string;
  entidade: string;
  exercicio: string;
  pageUrl: string;
}

interface acessdespesasGeraisProps {
  page: Page;
}

export async function getReceitas({
  initialDate,
  finalDate,
  pageUrl,
  entidade,
  exercicio,
}: getReceitasProps) {
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
  await acessPageReceitas({ page });

  // Disable dados consolidados
  await disableDadosConsolidados({ frameUrl: ".*/Home.aspx*", page });

  await changeDateInterval({
    frameUrl: ".*/ReceitasPorEntidade.aspx*",
    finalDate,
    page,
  });

  const total = await getTotal({
    page,
    frameUrl: ".*/ReceitasPorEntidade.aspx*",
  });

  if (!total) return;

  await getAllReceitas({ context, page, total });

  await browser.close();
  infoTitle(
    `Tempo total: ${moment.duration(moment.now() - inicio).humanize()}`
  );
}

async function acessPageReceitas({ page }: acessdespesasGeraisProps) {
  await page.evaluate(() => {
    eval(`ProcessaDados('lnkReceitaExtraOrcamentaria')`);
  });
  await page.waitForResponse(
    (response) =>
      response.url().includes("ReceitasPorEntidade.aspx") &&
      response.status() == 200
  );

  ok("Página de despesas extras acessada");
}

async function getAllReceitas({
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
    `${url}ReceitasPorEntidade.aspx?bolMostraDadosConsolidados=N`,
    {
      waitUntil: "networkidle",
    }
  );
  const colunas = await getColuns(page, "gridReceitas");

  await getReceita({ page, colunas });
}

async function getReceita({
  page,
  colunas,
}: {
  page: Page;
  colunas: string[];
}) {
  await page.waitForLoadState("networkidle");
  const linhas = await page.$$eval(
    `#gridReceitas_DXMainTable > tbody > tr.dxgvDataRow`,
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
      eval(`aspxGVPagerOnClick('gridReceitas','PBN');`)
    );
    await page.waitForResponse(
      (response) =>
        response.url().includes("ReceitasPorEntidade.aspx") &&
        response.status() == 200
    );
    await page.evaluate(() => eval("AtualizarGrid()"));
    await getReceita({
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
  const inserts = receitas.map((receita) => {
    const obj = {} as any;
    colunas.forEach(
      (coluna) => (obj[coluna] = receita[colunas.indexOf(coluna)])
    );
    return obj;
  });
  console.log(inserts);
}
