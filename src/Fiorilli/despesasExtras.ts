import { Prisma } from "@prisma/client";

import moment from "moment";
import {
  Page,
  chromium,
  Browser,
  Frame,
  BrowserContext,
} from "playwright-core";
import {
  blockRequests,
  error,
  info,
  infoTitle,
  ok,
  sleep,
  title,
} from "../utils";
import { getDadosEmpenhoFromList, save } from "./despesasGerais";
import {
  changeExercicio,
  changeEntidade,
  disableDadosConsolidados,
  changeDateInterval,
  getTotal,
} from "./portal";

type AnoWithEntidadeName = Prisma.AnoGetPayload<{
  include: {
    entidadeName: {
      include: {
        entidade: {
          include: { portal: true };
        };
      };
    };
  };
}>;

interface getDespesasExtrasProps {
  initialDate?: string;
  finalDate?: string;
  ano: AnoWithEntidadeName;
}

interface acessdespesasGeraisProps {
  page: Page;
}

export async function getDespesasExtras({
  ano: anoprop,
  initialDate,
  finalDate,
}: getDespesasExtrasProps) {
  const exercicio = `${anoprop.ano}`;
  const entidade = `${anoprop.entidadeName.name}`;
  const pageUrl = anoprop.entidadeName.entidade.portal.url;

  const inicio = moment.now();
  title(`Despesas Extras`);
  const browser = await chromium.launch({ headless: true, devtools: true });
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
  await acessPageDespesasExtras({ page });

  // Disable dados consolidados
  await disableDadosConsolidados({ page });

  await sleep({ time: 5000, page });

  await changeDateInterval({
    finalDate,
    page,
  });

  const total = await getTotal({
    page,
  });

  if (!total || total > 1000) return;

  await getAllDespesasExtras({ context, page, total, ano: anoprop, pageUrl });

  await browser.close();
  infoTitle(
    `Tempo total: ${moment.duration(moment.now() - inicio).humanize()}`
  );
}

async function acessPageDespesasExtras({ page }: acessdespesasGeraisProps) {
  await page.evaluate(() => {
    eval(`ProcessaDados('lnkDespesasPor_ExtraOrcamentaria')`);
  });
  await page.waitForResponse(
    (response) =>
      response.url().includes("DespesasPorEntidade.aspx") &&
      response.status() == 200
  );

  const url = page.url();
  await page.goto(
    `${url}DespesasPorEntidade.aspx?bolMostraDadosConsolidados=N`,
    {
      waitUntil: "networkidle",
    }
  );
  await page.bringToFront();

  ok("Página de despesas extras acessada");
}

async function getAllDespesasExtras({
  context,
  page,
  total,
  ano,
  pageUrl,
}: {
  context: BrowserContext;
  page: Page;
  total: number;
  ano: AnoWithEntidadeName;
  pageUrl: string;
}) {
  const pageDadosEmpenho = await context.newPage();

  await pageDadosEmpenho.goto(`${pageUrl}DadosEmpenho.aspx`);
  await page.bringToFront();
  const empenhosExtra = [];

  // eslint-disable-next-line no-constant-condition
  while (1) {
    await page.waitForLoadState("domcontentloaded");
    const links = await page.$$eval(
      "#gridDespesas_DXMainTable > tbody > tr.dxgvDataRow > td.CSS_lnkValor_ASPx",
      (e: any) => e.map((a: any) => a.getAttribute("onclick"))
    );

    empenhosExtra.push(...links);

    if (
      await page.evaluate(
        () => document.querySelectorAll("img.dxWeb_pNext").length
      )
    ) {
      await page.evaluate(() =>
        eval(`aspxGVPagerOnClick('gridDespesas','PBN')`)
      );
      await page.waitForResponse(
        (response) =>
          response.url().includes("DespesasPorEntidade.aspx") &&
          response.status() == 200
      );
    } else break;
  }

  const linhas = filterDespesasExtra({ onCellClick: empenhosExtra });
  for await (const link of linhas) {
    //console.log(link);
    await page.bringToFront();
    await page.evaluate((link: string) => eval(link), link);
    await page.waitForResponse(
      (response) =>
        response.url().includes("DespesasEmpenhosLista.aspx") &&
        response.status() == 200
    );

    await page?.waitForSelector("#btnVoltarDespesas", {
      state: "visible",
      timeout: 15000,
    });
    // call the function
    await getDadosEmpenhoFromList({
      ano,
      page,
      pageDadosEmpenho,
      func: save,
    });
    await page.evaluate(() => eval(`VoltarDespesas()`));
    await page.bringToFront();
    await page?.waitForSelector("#chkMostrarDadosConsolidados", {
      timeout: 5000,
    });
  }
}

function filterDespesasExtra({ onCellClick }: { onCellClick: string[] }) {
  let opcoes = onCellClick.map((e) =>
    e
      .replace(`onCellClick( `, ``)
      .replace(`)`, ``)
      .replace(`', '`, `,`)
      .replace(`', '`, `,`)
      .replace(`', '`, `,`)
      .replace(/'/g, "")
      .replace(/"/g, "")
      .split(`,`)
  );
  opcoes.forEach((op) => {
    opcoes = opcoes.filter(
      (e) =>
        !(
          e[0] === op[0] &&
          moment(moment(e[3], "DD/MM/YYYY")).isBefore(
            moment(op[3], "DD/MM/YYYY")
          )
        )
    );
  });
  return opcoes.map((e) => `onCellClick('${e.join("','")}')`);
}
