import { getDespesasExtras } from "./Fiorilli/despesasExtras";
import { getDespesasGerais } from "./Fiorilli/despesasGerais";
import { getReceitas } from "./Fiorilli/receitas";
import { getTransferencias } from "./Fiorilli/transferencias";

import { PrismaClient } from "@prisma/client";
import { title } from "./utils";
const prisma = new PrismaClient();

(async () => {
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
      Number(ano.ano) == anoAtual ||
      (Number(ano.ano) == anoAtual - 1 && mesAtual == 1)
      // || ano.ano == 2022
    ) {
      title(`Ano: ${ano.ano} - Entidade: ${ano.entidadeName.name}`);
      await getDespesasGerais({
        ano,
        //initialDate: `01/07/${ano.ano}`,
      });
      await getDespesasExtras({
        ano,
      });
      await getReceitas({
        ano,
      });
      await getTransferencias({
        ano,
      });
    }
  }
})();
