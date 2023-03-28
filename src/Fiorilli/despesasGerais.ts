import moment from "moment";
import { Page, chromium, BrowserContext } from "playwright-core";
import { blockRequests, error, infoTitle, ok, sleep, title } from "../utils";
import {
  changeExercicio,
  changeEntidade,
  disableDadosConsolidados,
  changeDateInterval,
  getTotal,
  tratamento,
} from "./portal";
import { PrismaClient, Prisma } from "@prisma/client";
import { info } from "console";
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

interface getDespesasGeraisProps {
  initialDate?: string;
  finalDate?: string;
  ano: AnoWithEntidadeName;
}

interface acessdespesasGeraisProps {
  page: Page;
}

export async function getDespesasGerais({
  ano: anoprop,
  initialDate,
  finalDate,
}: getDespesasGeraisProps) {
  const exercicio = `${anoprop.ano}`;
  const entidade = `${anoprop.entidadeName.name}`;
  const pageUrl = anoprop.entidadeName.entidade.portal.url;

  const inicio = moment.now();
  title(`Despesas Gerais`);
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
  await acessPageDespesasGerais({ page });

  await sleep({ time: 5000, page });

  // Disable dados consolidados
  await disableDadosConsolidados({ page });

  await changeDateInterval({
    finalDate,
    initialDate,
    page,
  });

  const total = await getTotal({
    page,
  });

  if (!total || total > 1000) return;

  await getAllDespesas({
    pageUrl,
    context,
    page,
    total,
    ano: anoprop,
  });

  await browser.close();
  infoTitle(
    `Tempo total: ${moment.duration(moment.now() - inicio).humanize()}`
  );
}

async function acessPageDespesasGerais({ page }: acessdespesasGeraisProps) {
  await page.evaluate(() => {
    eval(`ProcessaDados('lnkDespesasPor_NotaEmpenho')`);
  });
  await page.waitForResponse(
    (response) =>
      response.url().includes("DespesasPorEntidade.aspx") &&
      response.status() == 200
  );

  const url = page.url();
  await page.goto(`${url}DespesasPorEntidade.aspx`, {
    waitUntil: "networkidle",
  });

  ok("Página de despesas gerais acessada");
}

async function getAllDespesas({
  pageUrl,
  context,
  page,
  total,
  ano,
}: {
  pageUrl: string;
  context: BrowserContext;
  page: Page;
  total: number;
  ano: AnoWithEntidadeName;
}) {
  const empenhosNumber = Array(total).keys();
  await sleep({ time: 1000, page });
  const pageDadosEmpenho = await context.newPage();
  const pageEmpenhoLista = await context.newPage();

  await pageDadosEmpenho.goto(`${pageUrl}DadosEmpenho.aspx`);
  await pageEmpenhoLista.goto(`${pageUrl}DespesasEmpenhosLista.aspx`);

  for await (const empenhoNumber of empenhosNumber) {
    await page.waitForLoadState("domcontentloaded");
    await page.bringToFront();
    await page.evaluate(
      (i) =>
        eval(
          `window.setTimeout(function(){aspxGVCommandCustomButton('gridDespesas','btnDetalhes',${i});},0)`
        ),
      empenhoNumber
    );
    const response = await page.waitForResponse(
      (response: any) => {
        return (
          (response.url().endsWith("DadosEmpenho.aspx") ||
            response.url().includes("DespesasEmpenhosLista.aspx")) &&
          response.status(200)
        );
      },
      { timeout: 300000 }
    );

    if (response.url().endsWith("DadosEmpenho.aspx")) {
      await save({
        empenho: await getEmpenho({ page: pageDadosEmpenho }),
        ano,
      });
    }
    if (response.url().includes("DespesasEmpenhosLista.aspx")) {
      await pageEmpenhoLista.bringToFront();
      await pageEmpenhoLista.reload({ waitUntil: "networkidle" });
      await pageEmpenhoLista.waitForLoadState("domcontentloaded");
      await getDadosEmpenhoFromList({
        page: pageEmpenhoLista,
        pageDadosEmpenho,
        func: save,
        ano,
      });
      await page.evaluate(() => eval(`VoltarDespesas()`));
    }
    await page.$$eval(".CSS_divModalLoaderWindow", (els) =>
      els.forEach((el) => el.remove())
    );
  }
}

async function getEmpenho({ page }: { page: Page }) {
  await page.bringToFront();
  await page.reload();
  await page.waitForLoadState("domcontentloaded");
  const campos = await page.evaluateHandle(() =>
    Array.from(document.querySelectorAll("span.LabelDadosCampo"))
  );

  const historicoEl = await page.waitForSelector("span.LabelDadosHistorico", {
    state: "visible",
  });

  const empenho = await campos.evaluate((campos) => {
    const dados = {} as any;
    campos.map((campo) => {
      if (!campo.id.includes("ASPxPageControl") && campo.textContent != "")
        dados[
          campo.id.replace("txt", "") //.toLowerCase()
        ] = campo.textContent;
    });
    return dados;
  });

  empenho["Historico"] = await historicoEl.evaluate((el) => el.textContent);

  empenho["liquidacoes"] = await page.$$eval(
    `#gridParcelas_DXMainTable > tbody > tr.dxgvDataRow`,
    (elements: any) =>
      elements.map((item: any) => {
        const itens = item.getElementsByClassName("dxgv");
        return {
          numero: itens[1].textContent,
          data: itens[2].textContent,
          valor: itens[3].textContent,
          Vencimento: itens[4].textContent,
        };
      })
  );

  empenho["pagamentos"] = await page.$$eval(
    `#gridPagamentos_DXMainTable > tbody > tr.dxgvDataRow`,
    (elements: any) =>
      elements.map((item: any) => {
        const itens = item.getElementsByClassName("dxgv");
        return {
          numero: itens[0].textContent,
          parcela: itens[1].textContent,
          data: itens[2].textContent,
          valor: itens[3].textContent,
          retencao: itens[4].textContent,
          pago: itens[5].textContent,
        };
      })
  );

  //await page.click("#btnFecharDetalhe");

  return empenho;
}

export async function getDadosEmpenhoFromList({
  page,
  pageDadosEmpenho,
  func,
  ano,
}: {
  page: Page;
  pageDadosEmpenho: Page;
  func: ({
    empenho,
    ano,
  }: {
    empenho: any;
    ano: AnoWithEntidadeName;
  }) => Promise<any>;
  ano: AnoWithEntidadeName;
}) {
  const empenhos = [] as any;
  const total = await getTotal({
    page,
    log: false,
  });

  if (!total) {
    error("Não foi possível obter os dados da lista de empenhos");
    return empenhos;
  }

  for (let i = 0; i < total; i++) {
    await page.evaluate(
      (i) =>
        eval(
          `window.setTimeout(function(){aspxGVCommandCustomButton('gridDespesasEmpenhos','btnDetalhes',${i});},0)`
        ),
      i
    );
    await page.waitForResponse(
      (response: any) =>
        response.url().includes("DadosEmpenho.aspx") && response.status(200),
      { timeout: 50000 }
    );
    await func({ empenho: await getEmpenho({ page: pageDadosEmpenho }), ano });
  }

  return empenhos;
}

export async function save({
  empenho: emp,
  ano,
}: {
  empenho: any;
  ano: AnoWithEntidadeName;
}) {
  const { liquidacoes, pagamentos, ...empenho } = tratamento(emp);
  info(
    `${ano.ano} - ${empenho.Numero} - ${empenho.Tipo} - ${empenho.Favorecido}`
  );

  const dbempenho = await prisma.empenho.upsert({
    where: {
      anoId_Numero: {
        anoId: ano?.id as number,
        Numero: empenho.Numero,
      },
    },
    update: {
      ...empenho,
    },
    create: {
      anoId: ano?.id as number,
      ...empenho,
    },
  });
  for await (const liquidacao of liquidacoes) {
    await prisma.liquidacao.upsert({
      where: {
        numero_epenhoId: {
          numero: liquidacao.numero,
          epenhoId: dbempenho.id,
        },
      },
      update: {
        ...liquidacao,
      },
      create: {
        epenhoId: dbempenho.id,
        ...liquidacao,
      },
    });
  }
  for await (const pagamento of pagamentos) {
    await prisma.pagamento.upsert({
      where: {
        numero_epenhoId: {
          numero: pagamento.numero,
          epenhoId: dbempenho.id,
        },
      },
      update: {
        ...pagamento,
      },
      create: {
        epenhoId: dbempenho.id,
        ...pagamento,
      },
    });
  }
}
