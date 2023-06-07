import { getDespesasExtras } from "./Fiorilli/despesasExtras";
import { getDespesasGerais } from "./Fiorilli/despesasGerais";
import { getReceitas } from "./Fiorilli/receitas";
import { getTransferencias } from "./Fiorilli/transferencias";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cron = require("node-cron");

import { PrismaClient } from "@prisma/client";
import { title } from "./utils";
import app from "./api";
const prisma = new PrismaClient();

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
      title(`Ano: ${ano.ano} - Entidade: ${ano.entidadeName.name}`);
      // await prisma.transferencia.deleteMany({
      //   where: { anoId: ano.id },
      // });
      await getTransferencias({
        ano,
      });
      // await prisma.empenho.deleteMany({
      //   where: { anoId: ano.id },
      // });
      await getDespesasGerais({
        ano,
        //initialDate: `01/07/${ano.ano}`,
      });
      await getDespesasExtras({
        ano,
      });
      // await prisma.receita.deleteMany({
      //   where: { anoId: ano.id },
      // });
      await getReceitas({
        ano,
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
