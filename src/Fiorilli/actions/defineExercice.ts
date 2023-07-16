import { Page } from "playwright-core";

type Props = {
  entidade: string;
  exercicio: string;
  page: Page;
};

export async function defineExercice({ exercicio, entidade, page }: Props) {
  await changeExercicio({ page, exercicio });
  await changeEntidade({ page, entidade });
}

async function changeExercicio({
  page,
  exercicio,
}: {
  page: Page;
  exercicio: string;
}) {
  const exercicioInput = await page.waitForSelector(
    "input[id=cmbExercicio_I]",
    { state: "attached" }
  );

  await page.evaluate(() => {
    const selector = document.querySelector("input[id=cmbExercicio_I]");
    selector?.removeAttribute("disabled");
    selector?.removeAttribute("readonly");
  });

  if ((await exercicioInput.getAttribute("value")) == exercicio) {
    console.log("Exercicio já preenchido");
    return;
  }

  await exercicioInput?.fill(exercicio);
  await page.evaluate(() => {
    eval(`aspxETextChanged('cmbExercicio')`);
  });
  await page.waitForResponse(
    (response) =>
      response.url().includes("Home.aspx") && response.status() == 200
  );
  console.log("Exercicio preenchido");
}

async function changeEntidade({
  page,
  entidade,
}: {
  page: Page;
  entidade: string;
}) {
  const entidadeInput = await page.waitForSelector(
    "input[id=cmbEntidadeContabil_I]",
    { state: "attached" }
  );
  await page.evaluate(() => {
    const selector = document.querySelector("input[id=cmbEntidadeContabil_I]");
    selector?.removeAttribute("disabled");
    selector?.removeAttribute("readonly");
  });

  if ((await entidadeInput.getAttribute("value")) == entidade) {
    console.log("Entidade já preenchido");
    return;
  }

  await entidadeInput?.fill(entidade);
  await page.evaluate(() => {
    eval(`aspxETextChanged('cmbEntidadeContabil')`);
  });
  await page.waitForResponse(
    (response) =>
      response.url().includes("Home.aspx") && response.status() == 200
  );

  console.log("Entidade preenchida");
}
