import { Page, Frame } from "playwright-core";
import {
  defineExercice,
  openPage,
  acessPage,
  disableDadosConsolidados,
  getTotal,
} from "../actions";

import { PrismaClient, Prisma } from "@prisma/client";
import { getColuns, getFrameByName, tratamento } from "../utils";
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

export async function getTransferencias({ ano }: Props) {
  console.log(`\nTRANSFERÊNCIAS`);
  const exercicio = `${ano.ano}`;
  const entidade = `${ano.entidadeName.name}`;
  const page = await openPage({ url: ano.entidadeName.entidade.portal.url });

  await defineExercice({
    page,
    exercicio,
    entidade,
  });

  await acessPage({ page, pagina: "Transferencias" });

  const frame = await getFrameByName({ page, name: "frmPaginaAspx" });

  await disableDadosConsolidados({ frame });

  await getAllTransferencias({ page, ano });

  //await page.context().browser()?.close();
}

async function getAllTransferencias({
  page,
  ano,
}: {
  page: Page;
  ano: AnoWithEntidadeName;
}) {
  const mainFrame = await getFrameByName({ page, name: "frmPaginaAspx" });

  const total = await getTotal({
    frame: mainFrame,
    log: true,
  });

  if (!total || total > 1000) {
    console.log(`Total de despesas: ${total}`);
    return;
  }

  const transferenciasNumber = Array(total).keys();
  for await (const transferenciaNumber of transferenciasNumber) {
    const paginatedFrame = await getFrameByName({
      page,
      name: "frmPaginaAspx",
    });
    await paginatedFrame.waitForFunction(
      (value) =>
        eval(
          `window.setTimeout(function(){aspxGVCommandCustomButton('${value.grid}','btnDetalhes',${value.number});},0)`
        ),
      {
        number: transferenciaNumber,
        grid: "ASPxPageControl1_gridTransferencias",
      }
    );
    await paginatedFrame.waitForNavigation();
    const colunas = await getColuns(
      paginatedFrame,
      "ASPxPageControl1_gridTransferenciasDetalhes"
    );
    const linhas = await paginatedFrame.$$eval(
      `#ASPxPageControl1_gridTransferenciasDetalhes_DXMainTable > tbody > tr.dxgvDataRow`,
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

    await save({ receitas: linhas, colunas, ano });
    await paginatedFrame
      .locator("input[id=ASPxPageControl1_btnVoltar]")
      .click();
    await paginatedFrame.waitForNavigation();
    // console.log({ colunas, linhas });
    // await page.waitForTimeout(100000);
  }

  await page.context().browser()?.close();
}

async function save({
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
    // console.log(`${transferencia.Data} - ${transferencia.Concedida}`);
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
