import { Page, Frame } from "playwright-core";

export async function getColuns(page: Page | Frame, idGrid: string) {
  await page.waitForSelector(`#${idGrid}_DXHeadersRow`, {
    state: "visible",
  });
  const colunas = await page.evaluate((idGrid: string) => {
    const childrens: any = document.querySelectorAll(
      `#${idGrid}_DXHeadersRow > td > table > tbody > tr > td`
    );
    const itens = [];
    for (let i = 0; i < childrens.length; i++) {
      itens.push(
        childrens[i].innerText.normalize("NFD").replace(/[^a-zA-Zs]/g, "")
        //.toLowerCase()
      );
    }
    return itens;
  }, idGrid);

  return colunas;
}
