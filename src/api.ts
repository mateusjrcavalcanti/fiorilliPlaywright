import { PrismaClient } from "@prisma/client";
import express, { Express, Request, Response } from "express";

const app: Express = express();

const prisma = new PrismaClient();

app.get(
  "/:url/:entidade/despesas/:inicio/:fim/",
  async (req: Request, res: Response) => {
    let data: any[] = [];
    if (
      isNaN(Date.parse(req.params.inicio)) == false &&
      isNaN(Date.parse(req.params.fim)) == false
    ) {
      const inicio = new Date(req.params.inicio);
      const fim = new Date(req.params.fim);
      data = await prisma.empenho.findMany({
        orderBy: {
          Data: "desc",
        },
        where: {
          Data: {
            gte: inicio,
            lte: fim,
          },
          Ano: {
            entidadeName: {
              entidade: {
                EntidadeNames: {
                  some: {
                    name: `${req.params.entidade}`,
                  },
                },
              },
            },
          },
        },
        select: {
          Exercicio: true,
          Numero: true,
          Tipo: true,
          CPFCNPJ: true,
          Favorecido: true,
          Historico: true,
          Data: true,
          ValorEmpenhado: true,
          Processo: true,
          NumLicitacao: true,
          Inciso: true,
          TipoLicitacao: true,
          Poder: true,
          Orgao: true,
          Termo: true,
          Contrato: true,
          Unidade: true,
          IniContrato: true,
          FimContrato: true,
          NumConvenio: true,
          ContratoDetalhado: true,
          AnoConvenio: true,
          Funcao: true,
          SubFuncao: true,
          Programa: true,
          ProjetoAtividade: true,
          FonGrupo: true,
          FonCodigo: true,
          FonteSTN: true,
          Vinculo: true,
          CategoriaEconomica: true,
          GrupoNatureza: true,
          ModalidadeAplicacao: true,
          Elemento: true,
          Desdobro: true,
          Natureza: true,
          liquidacoes: true,
          pagamentos: true,
        },
      });
    }

    console.log(
      `/transparencia/${req.params.entidade}/despesas/${req.params.inicio}/${req.params.fim}/`
    );
    res.json(data);
  }
);

app.get(
  "/:url/:entidade/empenho/:numero/:tipo/:ano/",
  async (req: Request, res: Response) => {
    const data = await prisma.empenho.findMany({
      orderBy: {
        Data: "desc",
      },
      where: {
        Numero: { equals: req.params.numero },
        Tipo: { equals: req.params.tipo },
        Ano: {
          entidadeName: {
            entidade: {
              EntidadeNames: {
                some: {
                  name: `${req.params.entidade}`,
                },
              },
            },
          },
          ano: { equals: Number(req.params.ano) },
        },
      },
      select: {
        Exercicio: true,
        Numero: true,
        Tipo: true,
        CPFCNPJ: true,
        Favorecido: true,
        Historico: true,
        Data: true,
        ValorEmpenhado: true,
        Processo: true,
        NumLicitacao: true,
        Inciso: true,
        TipoLicitacao: true,
        Poder: true,
        Orgao: true,
        Termo: true,
        Contrato: true,
        Unidade: true,
        IniContrato: true,
        FimContrato: true,
        NumConvenio: true,
        ContratoDetalhado: true,
        AnoConvenio: true,
        Funcao: true,
        SubFuncao: true,
        Programa: true,
        ProjetoAtividade: true,
        FonGrupo: true,
        FonCodigo: true,
        FonteSTN: true,
        Vinculo: true,
        CategoriaEconomica: true,
        GrupoNatureza: true,
        ModalidadeAplicacao: true,
        Elemento: true,
        Desdobro: true,
        Natureza: true,
        liquidacoes: true,
        pagamentos: true,
      },
    });

    console.log(
      `/transparencia/${req.params.entidade}/empenho/${req.params.numero}/${req.params.ano}/`
    );
    res.json(data[0]);
  }
);

app.get(
  "/:url/:entidade/receitas/:inicio/:fim/",
  async (req: Request, res: Response) => {
    let data: any[] = [];
    if (
      isNaN(Date.parse(req.params.inicio)) == false &&
      isNaN(Date.parse(req.params.fim)) == false
    ) {
      const inicio = new Date(req.params.inicio);
      const fim = new Date(req.params.fim);
      data = await prisma.receita.findMany({
        where: {
          Data: {
            gte: inicio,
            lte: fim,
          },
          Ano: {
            entidadeName: {
              entidade: {
                EntidadeNames: {
                  some: {
                    name: `${req.params.entidade}`,
                  },
                },
              },
            },
          },
        },
      });
    }

    console.log(
      `/transparencia/${req.params.entidade}/receitas/${req.params.inicio}/${req.params.fim}/`
    );
    res.json(data);
  }
);

app.get(
  "/:url/:entidade/transferencias/:inicio/:fim/",
  async (req: Request, res: Response) => {
    let data: any[] = [];
    if (
      isNaN(Date.parse(req.params.inicio)) == false &&
      isNaN(Date.parse(req.params.fim)) == false
    ) {
      const inicio = new Date(req.params.inicio);
      const fim = new Date(req.params.fim);
      data = await prisma.transferencia.findMany({
        where: {
          Data: {
            gte: inicio,
            lte: fim,
          },
          Ano: {
            entidadeName: {
              entidade: {
                EntidadeNames: {
                  some: {
                    name: `${req.params.entidade}`,
                  },
                },
              },
            },
          },
        },
      });
    }

    console.log(
      `/transparencia/${req.params.entidade}/transferencias/${req.params.inicio}/${req.params.fim}/`
    );
    res.json(data);
  }
);

export default app;
