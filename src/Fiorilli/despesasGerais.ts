import { Page, chromium, Frame } from "playwright-core";
import {
  changeExercicio,
  changeEntidade,
  disableDadosConsolidados,
  changeDateInterval,
} from "./portal";

interface getDespesasGeraisProps {
  initialDate?: string;
  finalDate?: string;
}

interface acessdespesasGeraisProps {
  page: Page;
}

export async function getDespesasGerais({
  initialDate,
  finalDate,
}: getDespesasGeraisProps) {
  const browser = await chromium.launch({ headless: false, devtools: true });
  const page = await browser.newPage();
  await page.goto("http://170.78.48.18:8079/transparencia");

  // Change exercicio e entidade
  await changeExercicio({ page, exercicio: "2021" });
  await changeEntidade({ page, entidade: "CAMARA MUNICIPAL DE DORMENTES" });

  // Wait for page load
  await page.waitForTimeout(4000);

  // Acess page despesas gerais
  await acessPageDespesasGerais({ page });

  // Disable dados consolidados
  const frameHome = page.frame({ url: new RegExp(".*/Home.aspx*", "i") });
  if (frameHome) await disableDadosConsolidados({ frame: frameHome });

  //console.log(page.frames());

  const frameDespesasPorEntidade = page.frame({
    url: new RegExp(".*/DespesasPorEntidade.aspx*", "i"),
  });

  if (frameDespesasPorEntidade && (initialDate || finalDate)) {
    initialDate = !initialDate
      ? `01/01/${finalDate?.split("/")[2]}`
      : initialDate;
    finalDate = !finalDate ? `31/12/${initialDate?.split("/")[2]}` : finalDate;
    await changeDateInterval({
      finalDate,
      initialDate,
      frame: frameDespesasPorEntidade,
      page,
      url: "DespesasPorEntidade.aspx",
    });
  }

  //await browser.close();
}

export async function acessPageDespesasGerais({
  page,
}: acessdespesasGeraisProps) {
  await page.evaluate(() => {
    eval(`ProcessaDados('lnkDespesasPor_NotaEmpenho')`);
  });
  await page.waitForResponse(
    (response) =>
      response.url().includes("DespesasPorEntidade.aspx") &&
      response.status() == 200
  );

  console.log("Página de despesas gerais acessada");
}
