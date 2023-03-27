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

interface getDespesasGeraisProps {
  initialDate?: string;
  finalDate?: string;
  pageUrl: string;
  entidade: string;
  exercicio: string;
}

interface acessdespesasGeraisProps {
  page: Page;
}

export async function getDespesasGerais({
  initialDate,
  finalDate,
  exercicio,
  entidade,
  pageUrl,
}: getDespesasGeraisProps) {
  const inicio = moment.now();
  title(`Despesas Gerais`);
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
  await acessPageDespesasGerais({ page });

  // Disable dados consolidados
  await disableDadosConsolidados({ frameUrl: ".*/Home.aspx*", page });

  await changeDateInterval({
    frameUrl: ".*/DespesasPorEntidade.aspx*",
    finalDate,
    initialDate,
    page,
  });

  const total = await getTotal({
    page,
    frameUrl: ".*/DespesasPorEntidade.aspx*",
  });

  if (!total) return;

  await getAllDespesas({
    context,
    page,
    total,
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

  ok("Página de despesas gerais acessada");
}

async function getAllDespesas({
  context,
  page,
  total,
}: {
  context: BrowserContext;
  page: Page;
  total: number;
}) {
  const empenhosNumber = Array(total).keys();
  await sleep({ time: 1000, page });
  const pageDadosEmpenho = await context.newPage();
  const pageEmpenhoLista = await context.newPage();
  const url = page.url();
  await pageDadosEmpenho.goto(`${url}DadosEmpenho.aspx`);
  await pageEmpenhoLista.goto(`${url}DespesasEmpenhosLista.aspx`);
  await page.goto(
    `${url}DespesasPorEntidade.aspx?bolMostraDadosConsolidados=N`,
    {
      waitUntil: "networkidle",
    }
  );
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
      { timeout: 70000 }
    );

    if (response.url().endsWith("DadosEmpenho.aspx")) {
      await save({ empenho: await getEmpenho({ page: pageDadosEmpenho }) });
    }
    if (response.url().includes("DespesasEmpenhosLista.aspx")) {
      await pageEmpenhoLista.bringToFront();
      await pageEmpenhoLista.reload({ waitUntil: "networkidle" });
      await pageEmpenhoLista.waitForLoadState("domcontentloaded");
      await getDadosEmpenhoFromList({
        page: pageEmpenhoLista,
        pageDadosEmpenho,
        func: save,
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
        dados[campo.id.replace("txt", "").toLowerCase()] = campo.textContent;
    });
    return dados;
  });

  empenho["historico"] = await historicoEl.evaluate((el) => el.textContent);

  empenho["liquidacoes"] = await page.$$eval(
    `#gridParcelas_DXMainTable > tbody > tr.dxgvDataRow`,
    (elements: any) =>
      elements.map((item: any) => {
        const itens = item.getElementsByClassName("dxgv");
        return {
          numero: itens[1].textContent,
          data: itens[2].textContent,
          valor: itens[3].textContent,
          vencimento: itens[4].textContent,
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
}: {
  page: Page;
  pageDadosEmpenho: Page;
  func: ({ empenho }: { empenho: any }) => Promise<any>;
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
    await func({ empenho: await getEmpenho({ page: pageDadosEmpenho }) });
  }

  return empenhos;
}

export async function save({ empenho }: { empenho: any }) {
  empenho = tratamento(empenho);
  console.log(empenho);

  //const { numero, tipo, data, favorecido } = empenho;
  //console.log({ numero, tipo, data, favorecido });
  return empenho;
}
