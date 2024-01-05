/*
  Warnings:

  - Made the column `Tipo` on table `Empenho` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Empenho" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "Exercicio" INTEGER NOT NULL,
    "Numero" TEXT,
    "Tipo" TEXT NOT NULL,
    "CPFCNPJ" TEXT,
    "Favorecido" TEXT,
    "Historico" TEXT,
    "Data" DATETIME,
    "ValorEmpenhado" REAL NOT NULL,
    "Processo" TEXT,
    "NumLicitacao" TEXT,
    "Inciso" TEXT,
    "TipoLicitacao" TEXT,
    "Poder" TEXT,
    "Orgao" TEXT,
    "Termo" TEXT,
    "Contrato" TEXT,
    "Unidade" TEXT,
    "IniContrato" TEXT,
    "FimContrato" TEXT,
    "NumConvenio" TEXT,
    "ContratoDetalhado" TEXT,
    "AnoConvenio" TEXT,
    "Funcao" TEXT,
    "SubFuncao" TEXT,
    "Programa" TEXT,
    "ProjetoAtividade" TEXT,
    "FonGrupo" TEXT,
    "FonCodigo" TEXT,
    "FonteSTN" TEXT,
    "Vinculo" TEXT,
    "CategoriaEconomica" TEXT,
    "GrupoNatureza" TEXT,
    "ModalidadeAplicacao" TEXT,
    "Elemento" TEXT,
    "Desdobro" TEXT,
    "Natureza" TEXT,
    "NumFicha" TEXT,
    "anoId" INTEGER NOT NULL,
    CONSTRAINT "Empenho_anoId_fkey" FOREIGN KEY ("anoId") REFERENCES "Ano" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Empenho" ("AnoConvenio", "CPFCNPJ", "CategoriaEconomica", "Contrato", "ContratoDetalhado", "Data", "Desdobro", "Elemento", "Exercicio", "Favorecido", "FimContrato", "FonCodigo", "FonGrupo", "FonteSTN", "Funcao", "GrupoNatureza", "Historico", "Inciso", "IniContrato", "ModalidadeAplicacao", "Natureza", "NumConvenio", "NumFicha", "NumLicitacao", "Numero", "Orgao", "Poder", "Processo", "Programa", "ProjetoAtividade", "SubFuncao", "Termo", "Tipo", "TipoLicitacao", "Unidade", "ValorEmpenhado", "Vinculo", "anoId", "id") SELECT "AnoConvenio", "CPFCNPJ", "CategoriaEconomica", "Contrato", "ContratoDetalhado", "Data", "Desdobro", "Elemento", "Exercicio", "Favorecido", "FimContrato", "FonCodigo", "FonGrupo", "FonteSTN", "Funcao", "GrupoNatureza", "Historico", "Inciso", "IniContrato", "ModalidadeAplicacao", "Natureza", "NumConvenio", "NumFicha", "NumLicitacao", "Numero", "Orgao", "Poder", "Processo", "Programa", "ProjetoAtividade", "SubFuncao", "Termo", "Tipo", "TipoLicitacao", "Unidade", "ValorEmpenhado", "Vinculo", "anoId", "id" FROM "Empenho";
DROP TABLE "Empenho";
ALTER TABLE "new_Empenho" RENAME TO "Empenho";
CREATE UNIQUE INDEX "Empenho_anoId_Numero_Tipo_key" ON "Empenho"("anoId", "Numero", "Tipo");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
