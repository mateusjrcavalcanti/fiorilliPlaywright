import { Page } from "playwright-core";

type Props = {
  page: Page;
  pagina: "Despesas Gerais" | "Despesas Extras" | "Receitas" | "Transferencias";
};

export async function acessPage({ page, pagina }: Props) {
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
