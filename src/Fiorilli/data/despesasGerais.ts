import { Page, Frame } from "playwright-core";
import {
  defineExercice,
  openPage,
  acessPage,
  disableDadosConsolidados,
  changeDateInterval,
  getTotal,
} from "../actions";

import { PrismaClient, Prisma } from "@prisma/client";
import { getFrameByName, tratamento } from "../utils";
const prisma = new PrismaClient();

type Props = {
  ano: AnoWithEntidadeName;
  initialDate?: string;
  finalDate?: string;
};

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

export async function despesasGerais({ initialDate, finalDate, ano }: Props) {
  console.log(`\nDESPESAS GERAIS`);
  const exercicio = `${ano.ano}`;
  const entidade = `${ano.entidadeName.name}`;
  const page = await openPage({ url: ano.entidadeName.entidade.portal.url });

  await defineExercice({
    page,
    exercicio,
    entidade,
  });

  await acessPage({ page, pagina: "Despesas Gerais" });

  const frame = await getFrameByName({ page, name: "frmPaginaAspx" });

  await disableDadosConsolidados({ frame });

  if (initialDate || finalDate) {
    await changeDateInterval({
      finalDate,
      initialDate,
      frame,
      log: true,
    });
  }

  const total = await getTotal({
    frame,
    log: true,
  });
  if (!total || total > 1000) {
    console.log(`Total de despesas: ${total}`);
    return;
  }

  await getPageData({ page, ano, total, initialDate, finalDate });

  await page.context().browser()?.close();
}

export async function getPageData({
  page,
  ano,
  total,
  initialDate,
  finalDate,
  grid,
}: {
  page: Page;
  total: number;
  ano: AnoWithEntidadeName;
  initialDate?: string;
  finalDate?: string;
  grid?: "gridDespesas" | "gridDespesasEmpenhos";
}) {
  const empenhosNumber = Array(total).keys();

  for await (const empenhoNumber of empenhosNumber) {
    const props = { number: empenhoNumber, grid: grid || "gridDespesas" };
    let routeType = "";

    const frame = await getFrameByName({ page, name: "frmPaginaAspx" });
    await frame.waitForFunction(
      (value) =>
        eval(
          `window.setTimeout(function(){aspxGVCommandCustomButton('${value.grid}','btnDetalhes',${value.number});},0)`
        ),
      props
    );

    await frame.page().waitForRequest(async (request) => {
      if (
        request.resourceType() === "document" &&
        request.url().includes("DespesasEmpenhosLista")
        // && (await request.response())?.status() === 200
      ) {
        routeType = "DespesasEmpenhosLista";
        return true;
      } else if (
        request.resourceType() === "document" &&
        request.url().includes("DadosEmpenho") &&
        (await request.response())?.status() === 200
      ) {
        routeType = "DadosEmpenho";
        return true;
      } else {
        //console.log({ url: request.url(), type: request.resourceType() });
        return false;
      }
    });

    await verifyDadosEmpenho({
      routeType,
    });
    await verifyDespesasEmpenhosLista({
      routeType,
    });
  }

  async function verifyDadosEmpenho({ routeType }: { routeType: string }) {
    if (routeType == "DadosEmpenho") {
      const frame = await getFrameByName({ page, name: "_ifrLoaderWindow" });
      await frame.waitForNavigation();
      const empenho = await getEmpenho({ frame });
      await save({
        empenho,
        ano,
      });
      await frame.locator("#btnFecharDetalhe").click();
    }
  }

  async function verifyDespesasEmpenhosLista({
    routeType,
  }: {
    routeType: string;
  }) {
    if (routeType == "DespesasEmpenhosLista") {
      const frame = await getFrameByName({ page, name: "frmPaginaAspx" });
      await frame.waitForNavigation();
      const totalEmpenhos = (await getTotal({
        frame,
      })) as number;
      await getPageData({
        grid: "gridDespesasEmpenhos",
        page,
        ano,
        total: totalEmpenhos,
      });
      await frame.locator("input[id=btnVoltarDespesas]").click();
      await frame.waitForNavigation();
      if (initialDate || finalDate) {
        await changeDateInterval({
          finalDate,
          initialDate,
          frame,
        });
      }
    }
  }
}

export async function getEmpenho({ frame }: { frame: Frame }) {
  const data = { pagamentos: [], liquidacoes: [] } as any;
  const inputs = await frame.locator("span.LabelDadosCampo").all();

  for await (const input of inputs) {
    const name = `${await input.getAttribute("id")}`.replace("txt", "");
    const value = await input.textContent();
    if (!name?.includes("ASPxPageControl") && name != "")
      data[name as string] = tratamento(value);
  }

  const txtHistorico = frame.locator("span#txtHistorico").first();
  data["Historico"] = await txtHistorico.textContent();

  const liquidacoes = await frame
    .locator("#gridParcelas_DXMainTable > tbody > tr.dxgvDataRow")
    .all();
  for await (const input of liquidacoes) {
    const itens = await input.locator("td.dxgv").allTextContents();
    data["liquidacoes"].push({
      numero: itens[1],
      data: itens[2],
      valor: itens[3],
      Vencimento: itens[4],
    });
  }

  const pagamentos = await frame
    .locator("#gridPagamentos_DXMainTable > tbody > tr.dxgvDataRow")
    .all();
  for await (const input of pagamentos) {
    const itens = await input.locator("td.dxgv").allTextContents();
    data["pagamentos"].push({
      numero: itens[0],
      parcela: itens[1],
      data: itens[2],
      valor: itens[3],
      retencao: itens[4],
      pago: itens[5],
    });
  }

  return data;
}

export async function save({
  empenho: emp,
  ano,
}: {
  empenho: any;
  ano: AnoWithEntidadeName;
}) {
  const { liquidacoes, pagamentos, ...empenho } = tratamento(emp);
  // console.log(
  //   `${ano.ano} | ${empenho.Data} - ${empenho.Numero} - ${empenho.Tipo} - ${empenho.Favorecido}`
  // );

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
