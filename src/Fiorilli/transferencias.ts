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

interface getTransferenciasProps {
  initialDate?: string;
  finalDate?: string;
  ano: AnoWithEntidadeName;
}

interface acessTransferenciasProps {
  page: Page;
}

export async function getTransferencias({
  initialDate,
  finalDate,
  ano: anoprop,
}: getTransferenciasProps) {
  const exercicio = `${anoprop.ano}`;
  const entidade = `${anoprop.entidadeName.name}`;
  const pageUrl = anoprop.entidadeName.entidade.portal.url;
  const inicio = moment.now();
  title(`Transferências`);
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

  await getAllTransferencias({ context, page, total, ano: anoprop });

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
  ano,
}: {
  context: BrowserContext;
  page: Page;
  total: number;
  ano: AnoWithEntidadeName;
}) {
  const url = page.url();
  await page.goto(
    `${url}TransferenciasPorEntidade.aspx?bolMostraDadosConsolidados=N`,
    {
      waitUntil: "networkidle",
    }
  );
  const colunas = await getColuns(page, "gridTransferencias");

  await getTransferencia({ page, colunas, ano });
}

async function getTransferencia({
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
  save({ receitas: linhas, colunas, ano });
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
  for await (const transferencia of inserts) {
    info(`${transferencia.Data} - ${transferencia.Concedida}`);
    await prisma.transferencia.upsert({
      where: {
        CNPJEntPagadora_CNPJEntRecebedora_Data: {
          CNPJEntPagadora: transferencia.CNPJEntPagadora,
          CNPJEntRecebedora: transferencia.CNPJEntRecebedora,
          Data: transferencia.Data,
        },
      },
      update: {
        ...transferencia,
      },
      create: {
        anoId: ano.id,
        Exercicio: ano.ano,
        ...transferencia,
      },
    });
  }
}
