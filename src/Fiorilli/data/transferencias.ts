import { Page, Frame } from "playwright-core";
import {
  defineExercice,
  openPage,
  acessPage,
  disableDadosConsolidados,
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
  const frame = await getFrameByName({ page, name: "frmPaginaAspx" });
  const colunas = await getColuns(frame, "ASPxPageControl1_gridTransferencias");

  await getTransferencia({ frame, colunas, ano });

  await page.context().browser()?.close();
}

async function getTransferencia({
  frame,
  colunas,
  ano,
}: {
  frame: Frame;
  colunas: string[];
  ano: AnoWithEntidadeName;
}) {
  await frame.waitForLoadState("networkidle");
  const linhas = await frame.$$eval(
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
  await save({ receitas: linhas, colunas, ano });
  if (
    await frame.evaluate(
      () => document.querySelectorAll("img.dxWeb_pNext").length
    )
  ) {
    await frame.evaluate(() =>
      eval(`aspxGVPagerOnClick('gridTransferencias','PBN');`)
    );
    await frame
      .page()
      .waitForResponse(
        (response) =>
          response.url().includes("TransferenciasPorEntidade.aspx") &&
          response.status() == 200
      );
    await frame.evaluate(() => eval("AtualizarGrid()"));
    await getTransferencia({
      frame,
      colunas,
      ano,
    });
  }
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
    //console.log(`${transferencia.Data} - ${transferencia.Concedida}`);
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
