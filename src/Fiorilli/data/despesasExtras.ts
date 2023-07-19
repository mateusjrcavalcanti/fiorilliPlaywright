import { Page } from "playwright-core";
import {
  defineExercice,
  openPage,
  acessPage,
  disableDadosConsolidados,
  getTotal,
} from "../actions";

import { Prisma } from "@prisma/client";
import { getFrameByName } from "../utils";
import moment from "moment";
import { getPageData } from "./despesasGerais";

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

export async function despesasExtras({ ano }: Props) {
  console.log(`\nDESPESAS EXTRAS`);
  const exercicio = `${ano.ano}`;
  const entidade = `${ano.entidadeName.name}`;
  const page = await openPage({ url: ano.entidadeName.entidade.portal.url });

  await defineExercice({
    page,
    exercicio,
    entidade,
  });

  await acessPage({ page, pagina: "Despesas Extras" });

  const frame = await getFrameByName({ page, name: "frmPaginaAspx" });

  await disableDadosConsolidados({ frame });

  const total = await getTotal({
    frame,
    log: true,
  });
  if (!total || total > 1000) {
    console.log(`Total de despesas: ${total}`);
    return;
  }

  await getPageDataExtra({ page, ano });

  await page.context().browser()?.close();
}

async function getPageDataExtra({
  page,
  ano,
}: {
  page: Page;
  ano: AnoWithEntidadeName;
}) {
  const onclicks = filterDespesasExtra([...(await getOnClicks())]);

  for await (const onclick of onclicks) {
    const frame = await getFrameByName({ page, name: "frmPaginaAspx" });
    const btn = await frame.waitForSelector(`td[onclick="${onclick}"]`);
    await btn.click();

    await frame.waitForNavigation();

    const totalEmpenhos = (await getTotal({
      frame,
    })) as number;

    await getPageData({
      page,
      ano,
      total: totalEmpenhos,
      grid: "gridDespesasEmpenhos",
    });

    await frame.locator("input[id=btnVoltarDespesas]").click();
  }

  async function getOnClicks() {
    const onclicks = [] as string[];

    const frame = await getFrameByName({ page, name: "frmPaginaAspx" });
    const rows = await frame
      .locator(
        "#gridDespesas_DXMainTable > tbody > tr.dxgvDataRow > td.CSS_lnkValor_ASPx"
      )
      .all();

    for await (const row of rows) {
      const attibute = await row.getAttribute("onclick");
      if (attibute) onclicks.push(attibute);
    }

    const nextButtons = await frame.locator("img.dxWeb_pNext").all();
    if (nextButtons.length) {
      await nextButtons[0].click();
      await frame.waitForNavigation();
      onclicks.push(...(await getOnClicks()));
    }
    return onclicks;
  }
}

function filterDespesasExtra(onCellClick: string[]) {
  let clicks = [] as {
    in: string;
    out: string[];
  }[];
  onCellClick.forEach((e) => {
    clicks.push({
      in: e,
      out: e
        .replace(`onCellClick( `, ``)
        .replace(`)`, ``)
        .replace(`', '`, `,`)
        .replace(`', '`, `,`)
        .replace(`', '`, `,`)
        .replace(/'/g, "")
        .replace(/"/g, "")
        .split(`,`),
    });
  });

  clicks.forEach((op) => {
    clicks = clicks.filter(
      (e) =>
        !(
          e.out[0] === op.out[0] &&
          moment(moment(e.out[3], "DD/MM/YYYY")).isBefore(
            moment(op.out[3], "DD/MM/YYYY")
          )
        )
    );
  });

  return clicks.map((e) => e.in);
}
