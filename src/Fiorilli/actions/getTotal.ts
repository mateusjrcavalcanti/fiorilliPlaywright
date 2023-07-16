import { Frame } from "playwright-core";

export async function getTotal({
  frame,
  log,
}: {
  frame: Frame;
  log?: boolean;
}) {
  const selector =
    (await frame?.$("td.dxpSummary")) || (await frame?.$("td.dxpSummary"));

  if (!selector) {
    console.log("Não foi possível encontrar o total de linhas");
    return;
  }

  const RegExpMatch = (await selector.textContent())?.match(
    // eslint-disable-next-line no-useless-escape
    /(Total de linhas - )([\d\w\.]+)/
  ) as RegExpMatchArray;

  const sumario = Number(RegExpMatch[2]);

  if (log != undefined && log == true)
    console.log(`📊 Total de linhas: ${sumario}`);

  return sumario;
}
