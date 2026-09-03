class RecursosHumanosHtmlBuilder {
  static buildFiltersHtml(types) {
    const dataAtual = new DateHelper();
    const dataMesPassado = new DateHelper();
    dataMesPassado.dateAdd(-1, "month");

    return `
        <div class="lipeke-row" style="flex-wrap: wrap;">
          <div class="col-xs-12 col-md-2">
              <div class="lipeke-input-group">
                  <input type="date" id="ftInicial" placeholder="" value="">
                  <label for="ftInicial">Data Inicial</label>
              </div>
          </div>
          <div class="col-xs-12 col-md-2">
              <div class="lipeke-input-group">
                  <input type="date" id="ftFinal" placeholder="" value="">
                  <label for="ftFinal">Data Final</label>
              </div>
          </div>
          <div class="col-xs-12 col-md-2">
              <div class="lipeke-input-group">
                  <input type="text" id="ftNroDoc">
                  <label for="ftNroDoc">Nº do Documento</label>
              </div>
          </div>
          <div class="col-xs-12 col-md-2">
              <div class="lipeke-input-group">
                  <input type="text" id="ftAssunto" placeholder="">
                  <label for="ftAssunto">Assunto</label>
              </div>
          </div>
          <div class="col-xs-12 col-md-2">
              <div class="lipeke-input-group">
                  <input type="text" id="ftDescricao" placeholder="">
                  <label for="ftDescricao">Descrição</label>
              </div>
          </div>  
          <div class="col-xs-12 col-md-4">
            <div class="lipeke-input-group">
              <div id='usuario_fluig'></div>
            </div>
          </div>
          <div class="col-xs-12 col-md-2">
              <div class="lipeke-input-group">
                  <select id="status">
                      <option value="" selected="">Todos</option>
                      <option value="5">Confirmar Ciência</option>
                      <option value="12">Arquivar</option>
                  </select>
                  <label for="status">Status</label>
              </div>
          </div>
        </div>
    `;
  }

  static buildItemList(data, id, activities) {
    const ATIVIDADE_ATUAL = data.NUM_SEQ_ESTADO;



    const IS_NOVO = ATIVIDADE_ATUAL == activities.ATIVIDADE_NOVO || ATIVIDADE_ATUAL == activities.ATIVIDADE_INICIO;
    const IS_INICIAL = ATIVIDADE_ATUAL == activities.ATIVIDADE_NOVO || ATIVIDADE_ATUAL == activities.ATIVIDADE_INICIO || ATIVIDADE_ATUAL == activities.ATIVIDADE_CORRIGIR;
    const IS_FINAL = ATIVIDADE_ATUAL == activities.ATIVIDADE_ARQUIVAR || ATIVIDADE_ATUAL == activities.ATIVIDADE_FINALIZAR_RASCUNHO;

    const getSecondaryColor = (data) => {
      let colorClass;
      switch (parseInt(data.NUM_SEQ_ESTADO)) {
        case IS_NOVO:
          colorClass = "bg-info";
          break;
        case activities.ATIVIDADE_CORRIGIR:
          colorClass = "bg-warning";
          break;
        case activities.ATIVIDADE_ANALISE_REGIONAL:
          colorClass = "bg-purple-gradient";
          break;
        case activities.ATIVIDADE_ANALISE_SENAR:
          colorClass = "bg-green-gradient";
          break;
        case activities.ATIVIDADE_RECEBER_RESPOSTA:
          colorClass = "bg-yellow-gradient";
          break;
        case activities.ATIVIDADE_VISUALIZAR_DEVOLUTIVA:
          colorClass = "bg-blue-gradient";
          break;
        case activities.ATIVIDADE_ARQUIVAR:
        case activities.ATIVIDADE_ARQUIVAR2:
          colorClass = "bg-ocean-gradient";
          break;
        default:
          colorClass = "bg-info";
          break;
      }

      return [data.NOM_ESTADO, colorClass];
    };

    const getStatusClassColor = (status) => {
      switch (status) {
        case "0":
          // Andamento
          return "bg-info";
        case "1":
          // Cancelado
          return "bg-danger";
        case "2":
          // Finalizado
          return "bg-success";
      }
    };

    const getDadosDocumento = (data) => {
        try {
              
            const dataJson = JSON.parse(data.DOCUMENTOS_ANEXOS || "[]");
            const dadosDocumento = {
                documentId: dataJson[0].documentId,
                documentDescription: dataJson[0].documentDescription
            };
            return dadosDocumento;
        } catch (error) {
            console.error("Erro ao analisar DOCUMENTOS_ANEXOS:", error);
        }
    };

    const [secondaryText, secondaryCollor] = getSecondaryColor(data);

    const { documentId, documentDescription } = getDadosDocumento(data);

    let dataAnexos = [];
    try {
      dataAnexos = JSON.parse(data.DOCUMENTOS_ANEXOS || "[]");
    } catch (error) {
      console.error("Erro ao analisar DOCUMENTOS_ANEXOS:", error);
    }

    const getAnexosButton = (anexos) => {
      if (anexos && anexos.length > 0) {
        return anexos
          .map((el) => {
            return `
              <i data-toggle="tooltip" data-placement="bottom" title="${el.documentDescription}"
                class="flaticon flaticon-document-check text-danger icon-thumbnail-xs
                fs-cursor-pointer" id="el_documentoAnexo_${el.documentId}"
                data-original-title="Abrir documento anexo"></i>
            `;
          })
          .join("");
      }

      return `
        <i data-toggle="tooltip" data-placement="bottom" title="Nenhum documento anexado"
          class="flaticon flaticon-document-check text-danger icon-thumbnail-xs
          fs-cursor-not-allowed disabled" data-original-title="Nenhum documento anexado"></i>
      `;
    };

    const anexosButtonHtml = getAnexosButton(dataAnexos);

    data.SOLICITANTE_NOME = StringHelper.firstAndLastWord(data.SOLICITANTE_NOME);
    data.ANALISE_NOME = StringHelper.firstAndLastWord(data.ANALISE_NOME);
    data.PRESIDENTE_NOME = StringHelper.firstAndLastWord(data.PRESIDENTE_NOME);
    data.COORDENADOR_NOME = data.COORDENADOR_NOME ? StringHelper.firstAndLastWord(data.COORDENADOR_NOME) : "";

    const codigoTipoDocumentoText = data.CODIGO_TIPO_DOCUMENTO ? `- ${data.CODIGO_TIPO_DOCUMENTO}` : "";

    const observacoesText = data.OBSERVACOES_DOCUMENTO ? data.OBSERVACOES_DOCUMENTO.split("\n").join("<br/>") : "<span class=`text-gray-medium`>Nenhuma observação</span>";

    data.COORDENADOR_ANALISE_DATA = data.COORDENADOR_ANALISE_DATA ? DateHelper.formatDateTime(data.COORDENADOR_ANALISE_DATA) : null;


    const htmlSenar = data.ANALISE_DATA
      ? `
        <div class="strike">
            <span>
                <h5 style="width: 95%;">Análise Senar</h5>
            </span>
        </div>
        <div class="lipeke-row">
            <div class="fs-float-right">
                <b>Data:</b> ${DateHelper.formatDateTime(data.ANALISE_DATA)}
            </div>
        </div>
        <div class="lipeke-row">
            <div class="fs-float-right">
                <b>Nome:</b> ${data.ANALISE_NOME ? "Aprovado" : "Devolvido para correção"}
            </div>
        </div>
        <div class="lipeke-row">
            <div class="fs-float-right">
                <b>Decisão:</b> ${data.ANALISE_DECISAO ? "Aprovado" : "Devolvido para correção"}
            </div>
        </div>
        <div class="lipeke-row">
            <div class="fs-float-right">
                <b>Justificativa:</b> ${data.ANALISE_COMENTARIO ? data.ANALISE_COMENTARIO.split("\n").join("<br/>") : "<span class=`text-gray-medium`>Nenhuma observação</span>"}
            </div>
        </div>
    `
      : "";

    return `
        <div class="lipeke-panel fs-cursor-pointer" style="max-width: 400px;" id="el_${id}" >
            <div class="lipeke-panel-header" style="width: 65%;">
                Comunicado ${data.NUMERO_PROCESSO}
            </div>
            <div class="lipeke-panel-header lipeke-panel-header-status  ${getStatusClassColor(data.STATUS)}" 
                style="width: 35%">
                ${data.DESCRICAO_STATUS}
            </div>
            <div class="lipeke-panel-header lipeke-panel-header-status ${secondaryCollor}" style="width: 100%">
                ${secondaryText}
            </div>
            <div class="lipeke-panel-content lipeke-panel-content-protocolo">
                <div class="strike">
                    <span>
                        <h5 style="width: 95%;">Dados da Solicitação</h5>
                    </span>
                </div>
                <div style="width: 100%">
                    <div class="lipeke-col" style="width: 100%;	display: flex; align-items: flex-start;	flex-direction: row; gap: 10px;">
                        <div class="lipeke-row" style="width: 90%; flex-wrap: wrap;">
                            <div class="lipeke-row" style="">
                                <div class="fs-float-right">
                                    <b>Processo:</b> ${data.NUMERO_PROCESSO}
                                </div>
                            </div>
                            <div class="lipeke-row" style="">
                                <div class="fs-float-right">
                                    <b>DocumentoId:</b> ${documentId}
                                </div>
                            </div>
                            <div class="lipeke-row">
                                <div class="fs-float-right">
                                    <b>Documento:</b> ${documentDescription}
                                </div>
                            </div>
                            <div class="lipeke-row">
                                <div class="fs-float-right">
                                    <b>Nome:</b> ${data.FULL_NAME}
                                </div>
                            </div>
                        </div>
                        <div class="lipeke-row" style="width: 10%; display: flex; flex-direction: column; gap: 30px;">
                            ${anexosButtonHtml}
                        </div>
                    </div>
                </div>                
                <div class="strike">
                    <span>
                        <h5 style="width: 95%;">Dados da Ciência</h5>
                    </span>
                </div>
                <div class="lipeke-row">
                    <div class="fs-float-right">
                        <b>Data:</b> ${data.DATA_SOLICITACAO ? DateHelper.formatDateTime(data.DATA_SOLICITACAO) : ""}
                    </div>
                </div>
                <div class="lipeke-row">
                    <div class="fs-float-right">
                        <b>Observações:</b> ${data.OBSERVACAO}
                    </div>
                </div>
                ${htmlSenar}
                <div class="lipeke-row" style="display: flex; gap: 10px; margin-top: 20px;">
                    <button class="lipeke-btn" style="width: 100%; background-color: #30a66d" id="processo_${id}">Abrir Solicitação</button>
                </div>
            </div>
        </div>
      `;
  }
}
