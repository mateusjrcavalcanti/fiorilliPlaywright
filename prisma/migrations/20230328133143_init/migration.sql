-- CreateTable
CREATE TABLE "Portal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "url" TEXT NOT NULL,
    "lastUpdated" DATETIME,
    "lastScrapper" DATETIME,
    "acessos" INTEGER
);

-- CreateTable
CREATE TABLE "Entidade" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "portalId" INTEGER NOT NULL,
    CONSTRAINT "Entidade_portalId_fkey" FOREIGN KEY ("portalId") REFERENCES "Portal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EntidadeName" (
    "name" TEXT NOT NULL PRIMARY KEY,
    "entidadeId" INTEGER NOT NULL,
    CONSTRAINT "EntidadeName_entidadeId_fkey" FOREIGN KEY ("entidadeId") REFERENCES "Entidade" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ano" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ano" INTEGER NOT NULL,
    "lastScrapper" DATETIME,
    "nameId" TEXT NOT NULL,
    CONSTRAINT "Ano_nameId_fkey" FOREIGN KEY ("nameId") REFERENCES "EntidadeName" ("name") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Receita" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "Extra" INTEGER NOT NULL,
    "Data" DATETIME,
    "ArrecTotal" REAL NOT NULL,
    "Especificacao" TEXT NOT NULL,
    "Exercicio" INTEGER NOT NULL,
    "anoId" INTEGER NOT NULL,
    CONSTRAINT "Receita_anoId_fkey" FOREIGN KEY ("anoId") REFERENCES "Ano" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Transferencia" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "Data" DATETIME,
    "Recebida" REAL NOT NULL,
    "Concedida" REAL NOT NULL,
    "Historico" TEXT NOT NULL,
    "Exercicio" INTEGER NOT NULL,
    "EntidadePagadora" TEXT NOT NULL,
    "CNPJEntPagadora" TEXT NOT NULL,
    "EntidadeRecebedora" TEXT NOT NULL,
    "CNPJEntRecebedora" TEXT NOT NULL,
    "anoId" INTEGER NOT NULL,
    CONSTRAINT "Transferencia_anoId_fkey" FOREIGN KEY ("anoId") REFERENCES "Ano" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Empenho" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "Exercicio" INTEGER NOT NULL,
    "Numero" TEXT,
    "Tipo" TEXT,
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
    "anoId" INTEGER NOT NULL,
    CONSTRAINT "Empenho_anoId_fkey" FOREIGN KEY ("anoId") REFERENCES "Ano" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Liquidacao" (
    "numero" TEXT NOT NULL,
    "data" DATETIME,
    "Vencimento" DATETIME,
    "valor" REAL NOT NULL,
    "epenhoId" INTEGER NOT NULL,
    CONSTRAINT "Liquidacao_epenhoId_fkey" FOREIGN KEY ("epenhoId") REFERENCES "Empenho" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Pagamento" (
    "numero" TEXT NOT NULL,
    "parcela" TEXT NOT NULL,
    "data" DATETIME,
    "valor" REAL NOT NULL,
    "retencao" REAL NOT NULL,
    "pago" REAL NOT NULL,
    "epenhoId" INTEGER NOT NULL,
    CONSTRAINT "Pagamento_epenhoId_fkey" FOREIGN KEY ("epenhoId") REFERENCES "Empenho" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Portal_url_key" ON "Portal"("url");

-- CreateIndex
CREATE UNIQUE INDEX "Ano_ano_nameId_key" ON "Ano"("ano", "nameId");

-- CreateIndex
CREATE UNIQUE INDEX "Receita_Extra_Data_key" ON "Receita"("Extra", "Data");

-- CreateIndex
CREATE UNIQUE INDEX "Transferencia_CNPJEntPagadora_CNPJEntRecebedora_Data_key" ON "Transferencia"("CNPJEntPagadora", "CNPJEntRecebedora", "Data");

-- CreateIndex
CREATE UNIQUE INDEX "Empenho_anoId_Numero_key" ON "Empenho"("anoId", "Numero");

-- CreateIndex
CREATE UNIQUE INDEX "Liquidacao_numero_epenhoId_key" ON "Liquidacao"("numero", "epenhoId");

-- CreateIndex
CREATE UNIQUE INDEX "Pagamento_numero_epenhoId_key" ON "Pagamento"("numero", "epenhoId");
