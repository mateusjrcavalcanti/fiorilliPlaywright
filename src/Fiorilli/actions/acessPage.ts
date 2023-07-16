import { Page } from "playwright-core";
import { getFrameByName } from "../utils";

type Props = {
  page: Page;
  pagina: "Despesas Gerais" | "Despesas Extras" | "Receitas" | "Transferencias";
};

export async function acessPage({ page, pagina }: Props) {
  const paginas = {
    "Despesas Gerais": {
      ProcessaDados: "lnkDespesasPor_NotaEmpenho",
      response: "DespesasPorEntidade.aspx",
    },
    "Despesas Extras": {
      ProcessaDados: "lnkDespesasPor_ExtraOrcamentaria",
      response: "DespesasPorEntidade.aspx",
    },
    Receitas: {
      ProcessaDados: "lnkReceitaExtraOrcamentaria",
      response: "ReceitasPorEntidade.aspx",
    },
    Transferencias: {
      ProcessaDados: "LnkTransf",
      response: "TransferenciasPorEntidade.aspx",
    },
  };
  // await page.evaluate((data) => {
  //   eval(`ProcessaDados('${data}')`);
  // }, paginas[pagina].ProcessaDados);
  // await page.waitForResponse((response) =>
  //   response.url().includes(paginas[pagina].response)
  // );

  // await page.waitForLoadState("domcontentloaded");

  //const frame = await getFrameByName({ page, name: "frmPaginaAspx" });

  if (pagina === "Receitas") {
    await page.locator("#LnkMenuReceitas").hover();
    await page.getByText("Arrecadação Extra-Orçamentária").click();
  }

  if (pagina === "Despesas Gerais") {
    await page.locator("#LnkMenuDespesas").hover();
    await page.getByText("Despesas Gerais").click();
  }
  if (pagina === "Despesas Extras") {
    await page.locator("#LnkMenuDespesas").hover();
    await page.getByText("Extra Orçamentária").click();
  }

  if (pagina === "Transferencias") {
    await page.locator("#LnkMenuTransferencias").hover();
    await page.getByText("Transferências entre Entidades").click();
  }

  await page.waitForResponse(
    (response) =>
      response.request().resourceType() === "xhr" && response.status() === 200
  );

  console.log(`Página ${pagina} acessada`);
}
