/*
  Warnings:

  - Added the required column `Mes` to the `Transferencia` table without a default value. This is not possible if the table is not empty.
  - Added the required column `Previsto` to the `Transferencia` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Transferencia" (
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
    "Mes" INTEGER NOT NULL,
    "Previsto" REAL NOT NULL,
    "anoId" INTEGER NOT NULL,
    CONSTRAINT "Transferencia_anoId_fkey" FOREIGN KEY ("anoId") REFERENCES "Ano" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Transferencia" ("CNPJEntPagadora", "CNPJEntRecebedora", "Concedida", "Data", "EntidadePagadora", "EntidadeRecebedora", "Exercicio", "Historico", "Recebida", "anoId", "id") SELECT "CNPJEntPagadora", "CNPJEntRecebedora", "Concedida", "Data", "EntidadePagadora", "EntidadeRecebedora", "Exercicio", "Historico", "Recebida", "anoId", "id" FROM "Transferencia";
DROP TABLE "Transferencia";
ALTER TABLE "new_Transferencia" RENAME TO "Transferencia";
CREATE UNIQUE INDEX "Transferencia_CNPJEntPagadora_CNPJEntRecebedora_Data_key" ON "Transferencia"("CNPJEntPagadora", "CNPJEntRecebedora", "Data");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
