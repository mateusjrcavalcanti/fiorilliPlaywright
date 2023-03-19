/* eslint-disable @typescript-eslint/no-unused-vars */
import { getDespesasGerais } from "./Fiorilli/despesasGerais";

(async () => {
  console.log("\x1b[33m Welcome to the app! \x1b[0m");
  await getDespesasGerais({
    initialDate: "01/03/2021",
    finalDate: "30/03/2021",
  });
})();
