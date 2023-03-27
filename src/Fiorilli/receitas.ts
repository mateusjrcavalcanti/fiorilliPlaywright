import moment from "moment";
import { Page, chromium, BrowserContext } from "playwright-core";
import { blockRequests, infoTitle, ok, sleep, title } from "../utils";
import { PrismaClient, Prisma } from "@prisma/client";
const prisma = new PrismaClient();

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

import {
  changeExercicio,
  changeEntidade,
  disableDadosConsolidados,
  changeDateInterval,
  getTotal,
  getColuns,
  tratamento,
} from "./portal";
import { info } from "console";

interface getReceitasProps {
  initialDate?: string;
  finalDate?: string;
  ano: AnoWithEntidadeName;
}

interface acessdespesasGeraisProps {
  page: Page;
}

export async function getReceitas({
  initialDate,
  finalDate,
  ano: anoprop,
}: getReceitasProps) {
  const exercicio = `${anoprop.ano}`;
  const entidade = `${anoprop.entidadeName.name}`;
  const pageUrl = anoprop.entidadeName.entidade.portal.url;
  const inicio = moment.now();
  title(`Receitas`);
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

  await getAllReceitas({ context, page, total, ano: anoprop });

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
  ano,
}: {
  context: BrowserContext;
  page: Page;
  total: number;
  ano: AnoWithEntidadeName;
}) {
  const url = page.url();
  await page.goto(
    `${url}ReceitasPorEntidade.aspx?bolMostraDadosConsolidados=N`,
    {
      waitUntil: "networkidle",
    }
  );
  const colunas = await getColuns(page, "gridReceitas");

  await getReceita({ page, colunas, ano });
}

async function getReceita({
  page,
  colunas,
  ano,
}: {
  page: Page;
  colunas: string[];
  ano: AnoWithEntidadeName;
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
  save({ receitas: linhas, colunas, ano });
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
      ano,
    });
  }
}

export async function save({
  receitas,
  colunas,
  ano,
}: {
  receitas: any[];
  colunas: string[];
  ano: AnoWithEntidadeName;
}) {
  const inserts = receitas.map(async (receita) => {
    const obj = {} as any;
    colunas.forEach(
      (coluna) => (obj[coluna] = receita[colunas.indexOf(coluna)])
    );
    return tratamento(obj);
  });

  for await (const receita of inserts) {
    info(`${receita.Extra} - ${receita.Data} - ${receita.ArrecTotal}`);
    await prisma.receita.upsert({
      where: {
        Extra_Data: {
          Extra: receita.Extra,
          Data: receita.Data,
        },
      },
      update: {
        ...receita,
      },
      create: {
        anoId: ano.id,
        Exercicio: ano.ano,
        ...receita,
      },
    });
  }
}
