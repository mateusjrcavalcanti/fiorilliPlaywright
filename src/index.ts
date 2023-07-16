import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cron = require("node-cron");
import app from "./api";

import {
  despesasGerais,
  despesasExtras,
  getReceitas,
  getTransferencias,
} from "./Fiorilli/data";

app.listen(process.env.PORT || 3000, () => {
  console.log(
    `⚡️[server]: Server is running at http://localhost:${
      process.env.PORT || 3000
    }`
  );
});

async function update(retroativo = false) {
  const anos = await prisma.ano.findMany({
    include: {
      entidadeName: {
        include: {
          entidade: {
            include: { portal: true },
          },
        },
      },
    },
    orderBy: { ano: "desc" },
  });

  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth() + 1;

  for await (const ano of anos) {
    if (
      retroativo ||
      Number(ano.ano) == anoAtual ||
      (Number(ano.ano) == anoAtual - 1 && mesAtual == 1)
    ) {
      console.log(`Ano: ${ano.ano} - Entidade: ${ano.entidadeName.name}`);
      await getTransferencias({ ano });
      await getReceitas({ ano });
      await despesasExtras({
        ano,
      });
      await despesasGerais({
        ano,
        //initialDate: `20/03/${ano.ano}`,
      });
    }
  }
}

update();

cron.schedule(
  "*/30 * * * *",
  async () =>
    new Date().getHours() > 7 && new Date().getHours() < 18 && (await update())
);
