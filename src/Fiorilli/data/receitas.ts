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

export async function getReceitas({ ano }: Props) {
  console.log(`\nRECEITAS`);
  const exercicio = `${ano.ano}`;
  const entidade = `${ano.entidadeName.name}`;
  const page = await openPage({ url: ano.entidadeName.entidade.portal.url });

  await defineExercice({
    page,
    exercicio,
    entidade,
  });

  await acessPage({ page, pagina: "Receitas" });

  const frame = await getFrameByName({ page, name: "frmPaginaAspx" });

  await disableDadosConsolidados({ frame });

  await getAllReceitas({ page, ano });

  await page.context().browser()?.close();
}

async function getAllReceitas({
  page,
  ano,
}: {
  page: Page;
  ano: AnoWithEntidadeName;
}) {
  const frame = await getFrameByName({ page, name: "frmPaginaAspx" });
  const colunas = await getColuns(frame, "gridReceitas");

  await getReceita({ frame, colunas, ano });
}

async function getReceita({
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
    await frame.evaluate(
      () => document.querySelectorAll("img.dxWeb_pNext").length
    )
  ) {
    await frame.evaluate(() =>
      eval(`aspxGVPagerOnClick('gridReceitas','PBN');`)
    );
    await frame
      .page()
      .waitForResponse(
        (response) =>
          response.url().includes("ReceitasPorEntidade.aspx") &&
          response.status() == 200
      );
    await frame.evaluate(() => eval("AtualizarGrid()"));
    await getReceita({
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

  for await (const receita of inserts) {
    //console.log(`${receita.Extra} - ${receita.Data} - ${receita.ArrecTotal}`);
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
