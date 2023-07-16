import moment from "moment";
moment.locale("pt-br");

export function tratamento(dados: any) {
  Object.keys(dados).forEach((k) => {
    const log = {} as any;
    if (k == "liquidacoes")
      dados[k] = dados[k].map((data: any) => tratamento(data));
    if (k == "pagamentos")
      dados[k] = dados[k].map((data: any) => tratamento(data));

    if (k == "Data" || k == "data" || k == "Vencimento") {
      dados[k] = new Date(
        moment(dados[k], "DD/MM/YYYY").add(3, "h").format("YYYY-MM-DD")
      );
      log[k] = dados[k];
    }

    if (k == "Exercicio" || k == "Extra") dados[k] = Number(dados[k]);
    if (
      k == "ValorEmpenhado" ||
      k == "valor" ||
      k == "Recebida" ||
      k == "Concedida" ||
      k == "retencao" ||
      k == "pago" ||
      k == "ArrecTotal"
    )
      dados[k] = Number(dados[k].replace(".", "").replace(",", "."));

    //console.log(log);
  });
  return dados;
}
