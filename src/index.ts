import { getDespesasExtras } from "./Fiorilli/despesasExtras";
import { getDespesasGerais } from "./Fiorilli/despesasGerais";
import { getReceitas } from "./Fiorilli/receitas";
import { getTransferencias } from "./Fiorilli/transferencias";

const pageUrl = "http://170.78.48.18:8079/transparencia";
const exercicio = "2021";
const entidade = "CAMARA MUNICIPAL DE DORMENTES";

(async () => {
  await getDespesasGerais({
    pageUrl,
    exercicio,
    entidade,
  });
  await getDespesasExtras({
    pageUrl,
    exercicio,
    entidade,
  });
  await getReceitas({
    pageUrl,
    exercicio,
    entidade,
  });
  await getTransferencias({
    pageUrl,
    exercicio,
    entidade,
  });
})();
