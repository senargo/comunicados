class MobilizadorHtmlBuilder {
  static buildFiltersHtml(types) {
    const dataAtual = new DateHelper();
    const dataMesPassado = new DateHelper();
    dataMesPassado.dateAdd(-1, "month");

    return `
        <div class="lipeke-row" style="flex-wrap: wrap;">
          <div class="col-xs-12 col-md-2">
              <div class="lipeke-input-group">
                  <input type="date" id="ftInicial" placeholder="" value="${dataMesPassado.getDBDate()}">
                  <label for="ftInicial">Data Inicial</label>
              </div>
          </div>
          <div class="col-xs-12 col-md-2">
              <div class="lipeke-input-group">
                  <input type="date" id="ftFinal" placeholder="" value="${dataAtual.getDBDate()}">
                  <label for="ftFinal">Data Final</label>
              </div>
          </div>
          <div class="col-xs-12 col-md-2">
              <div class="lipeke-input-group">
                  <input type="text" id="ftNroDoc" placeholder="xxx/xxxx">
                  <label for="ftNroDoc">Nº do Documento</label>
              </div>
          </div>
          <div class="col-xs-12 col-md-4">
              <div class="lipeke-input-group">
                  <input type="text" id="ftAssuntoObs" placeholder="">
                  <label for="ftAssuntoObs">Assunto / Observações</label>
              </div>
          </div>
          <div class="col-xs-12 col-md-2">
              <div class="lipeke-input-group">
                  <select id="status">
                      <option value="" selected="">Todos</option>
                      <option value="1">Análise Coordenação Regional</option>
                      <option value="2">Análise Senar</option>
                      <option value="3">Corrigir</option>
                      <option value="4">Aguardar devolutiva</option>
                      <option value="5">Visualizar devolutiva</option>
                      <option value="6">Encerrado</option>
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

    const [secondaryText, secondaryCollor] = getSecondaryColor(data);

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

    /**
    data = {
      "COORDENADOR_MATRICULA": null,
      "DECISAO": null,
      "PARCEIRO_CODIGO": "",
      "ANEXO_DESPACHO_FISICO": null,
      "PARCEIRO_NOME": "",
      "ZOOM_NOME_OBSERVADORES": "",
      "OBSERVACOES_DOCUMENTO": "",
      "DESPACHO_NOME": null,
      "ZOOM_NOME_DESTINATARIO": null,
      "ASSUNTO_DOCUMENTO": null,
      "ID": "2",
      "NOME_MUNICIPIO": "Goiânia",
      "DATA_DOCUMENTO": null,
      "DOCUMENTID": "2357815",
      "DATA_SOLICITACAO": "",
      "CARDID": "2357814",
      "ANALISE_NOME": null,
      "NUMERO_PROCESSO_PAI": "",
      "ZOOM_NOME_DEPARTAMENTO": "ASSESSORIA DE TECNOLOGIA DA INFORMAÇÃO",
      "MUNICIPIO_NOME": "",
      "ANALISE_COMENTARIO": null,
      "ANALISE_MATRICULA": null,
      "FDANEXOCOMPROVANTE": null,
      "DESPACHO_DESTINATARIOS": null,
      "CODIGO_RESPONSAVEL": "2508",
      "ZOOM_TIPO_DOCUMENTO": "Ofício",
      "PRESIDENTE_EMAIL": null,
      "DEVOLUTIVA": "",
      "COORDENADOR_ANALISE_DATA": null,
      "MATRICULA_INTERESSADO": "rbvk21g83fkztrp21425036202935",
      "DOCUMENTOS_ANEXO": "",
      "DESPACHO_MATRICULA": null,
      "NUMERO_DOCUMENTO": null,
      "ANALISE_CODIGO": null,
      "SOLICITANTE_CODIGO": "",
      "CAMPO_DESCRITOR": "",
      "ANALISE_EMAIL": null,
      "ZOOM_NOME_ORIGEM": "SENAC AR/GO",
      "DESPACHO_ASSUNTO": null,
      "PROCESSO_ORIGEM": "",
      "FNANEXODESPACHOFISICO": "",
      "FNANEXOCOMPROVANTE": null,
      "SOLICITANTE_NOME": "",
      "NOME_RESPONSAVEL": "KHYQUER RONALDY DE OLIVEIRA CAMARGO",
      "CORRECAO_DATA": null,
      "DOCUMENTO_OBSERVACOES": null,
      "DEVOLUTIVA_DATA": "",
      "COORDENADOR_ANALISE_DECISAO": null,
      "TABLEID": "principal",
      "ANALISE_TEXTO": null,
      "NUMERO_PROCESSO": "",
      "VERSION": "2000",
      "FDANEXODESPACHOFISICO": "Despacho Físico.pdf",
      "RESOLUCAO": "",
      "CODIGO_MUNICIPIO": "08707",
      "PRESIDENTE_NOME": "",
      "COORDREGIONAL_EMAIL": null,
      "EMAIL_SOLICITANTE": "diogo.pessoa@senar-go.com.br",
      "ANALISE_DATA": null,
      "OBSERVACOES_ANALISE": null,
      "MATRICULA_SOLICITANTE": "3a501001b8da4d898647e984de8c4aad",
      "LOGIN_INTERESSADO": "pedrohl.senar-go.com.br.1",
      "CODIGO_TIPO_DOCUMENTO": "Oficio",
      "SOLICITANTE_EMAIL": "",
      "DESPACHO_DATA": "",
      "ANONYMIZATION_DATE": null,
      "DESPACHO_COMENTARIO": null,
      "CODIGO_INTERESSADO": "205",
      "COORDENADOR_ANALISE_COMENTARIO": null,
      "DOCUMENTOS_ANEXOS": "",
      "CODIGO_DEPARTAMENTO": "1.01.08",
      "ANONYMIZATION_USER_ID": null,
      "ANALISE_DECISAO": null,
      "COORDENADOR_EMAIL": null,
      "SOLICITANTE_MATRICULA": "",
      "PRESIDENTE_CODIGO": "",
      "RESOLUCAO_TEXTO": "",
      "COORDREGIONAL_NOME": null,
      "COORDREGIONAL_MATRICULA": null,
      "DESPACHO_CODIGO": null,
      "DESPACHO_EMAIL": null,
      "DOCUMENTO_ASSUNTO": null,
      "NOME_ESTADO": "Goiás",
      "ZOOM_NOME_INTERESSADO": "PEDRO HENRIQUE LEMES CAMILO",
      "CODIGO_RM_ORIGEM": "001226",
      "ZOOM_NOME_MUNICIPIO": "",
      "COORDREGIONAL_CODIGO": null,
      "CORRECAO_TEXTO": null,
      "COMPANYID": "1",
      "MUNICIPIO_CODIGO": "",
      "CODIGO_SOLICITANTE": "2508",
      "DESPACHO_TEXTO": "",
      "CODIGO_ESTADO": "GO",
      "EMAIL_INTERESSADO": "pedrohl@senar-go.com.br",
      "DOCUMENTO_NUMERO": null,
      "FDANEXODOCUMENTO": "Documento Protocolado.pdf",
      "PRESIDENTE_MATRICULA": null,
      "DOCUMENTO_DATA": null,
      "ANALISE_RESUMO": null,
      "NOME_SOLICITANTE": "KHYQUER RONALDY (TESTE)",
      "DEVOLUTIVA_TEXTO": "",
      "ZOOM_SELECAO_ASSUNTO": "",
      "FNANEXODOCUMENTO": "",
      "COORDENADOR_CODIGO": null,
      "COORDENADOR_NOME": null,
      "DESPACHO_USUARIO": null,
    };
 */

    data.SOLICITANTE_NOME = StringHelper.firstAndLastWord(data.SOLICITANTE_NOME);
    data.ANALISE_NOME = StringHelper.firstAndLastWord(data.ANALISE_NOME);
    data.PRESIDENTE_NOME = StringHelper.firstAndLastWord(data.PRESIDENTE_NOME);
    data.COORDENADOR_NOME = data.COORDENADOR_NOME ? StringHelper.firstAndLastWord(data.COORDENADOR_NOME) : "";

    const codigoTipoDocumentoText = data.CODIGO_TIPO_DOCUMENTO ? `- ${data.CODIGO_TIPO_DOCUMENTO}` : "";

    const observacoesText = data.OBSERVACOES_DOCUMENTO ? data.OBSERVACOES_DOCUMENTO.split("\n").join("<br/>") : "<span class=`text-gray-medium`>Nenhuma observação</span>";

    data.COORDENADOR_ANALISE_DATA = data.COORDENADOR_ANALISE_DATA ? DateHelper.formatDateTime(data.COORDENADOR_ANALISE_DATA) : null;

    const htmlCoordenacao = data.COORDENADOR_ANALISE_DATA
      ? `
        <div class="strike">
            <span>
                <h5 style="width: 95%;">Análise Coordenação Regional</h5>
            </span>
        </div>
        <div class="lipeke-row">
            <div class="fs-float-right">
                <b>Data:</b> ${data.COORDENADOR_ANALISE_DATA}
            </div>
        </div>
        <div class="lipeke-row">
            <div class="fs-float-right">
                <b>Nome:</b> ${data.COORDENADOR_NOME}
            </div>
        </div>
        <div class="lipeke-row">
            <div class="fs-float-right">
                <b>Decisão:</b> ${data.COORDENADOR_ANALISE_DECISAO == 'aprovado' ? "Aprovado" : "Devolvido para correção"}
            </div>
        </div>
        <div class="lipeke-row">
            <div class="fs-float-right">
                <b>Justificativa:</b> ${data.COORDENADOR_ANALISE_COMENTARIO ? data.COORDENADOR_ANALISE_COMENTARIO.split("\n").join("<br/>") : "<span class=`text-gray-medium`>Nenhuma observação</span>"}
            </div>
        </div>
    `
      : "";

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

    const htmlDevolutiva = data.DEVOLUTIVA_DATA
      ? `
        <div class="strike">
            <span>
                <h5 style="width: 95%;">Devolutiva</h5>
            </span>
        </div>
        <div class="lipeke-row">
            <div class="fs-float-right">
                <b>Data:</b> ${DateHelper.formatDateTime(data.DEVOLUTIVA_DATA)}
            </div>
        </div>
        <div class="lipeke-row">
            <div class="fs-float-right">
                <b>Justificativa:</b> ${data.DEVOLUTIVA_TEXTO ? data.DEVOLUTIVA_TEXTO.split("\n").join("<br/>") : "<span class=`text-gray-medium`>Nenhuma devolutiva.</span>"}
            </div>
        </div>
    `
      : "";

    return `
        <div class="lipeke-panel fs-cursor-pointer" style="max-width: 400px;" id="el_${id}" >
            <div class="lipeke-panel-header" style="width: 65%;">
                Ofício ${data.DOCUMENTO_NUMERO}
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
                                    <b>DocumentoId:</b> ${data.DOCUMENTID}
                                </div>
                            </div>
                            <div class="lipeke-row">
                                <div class="fs-float-right">
                                    <b>Solicitante:</b> ${data.SOLICITANTE_NOME}
                                </div>
                            </div>
                            <div class="lipeke-row">
                                <div class="fs-float-right">
                                    <b>Parceiro:</b> ${data.PARCEIRO_NOME}
                                </div>
                            </div>
                            <div class="lipeke-row">
                                <div class="fs-float-right">
                                    <b>Presidente:</b> ${data.PRESIDENTE_NOME}
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
                        <h5 style="width: 95%;">Dados do Documento</h5>
                    </span>
                </div>
                <div class="lipeke-row">
                    <div class="fs-float-right">
                        <b>Data:</b> ${data.DOCUMENTO_DATA}
                    </div>
                </div>
                <div class="lipeke-row">
                    <div class="fs-float-right">
                        <b>Assunto:</b> ${data.DOCUMENTO_ASSUNTO}
                    </div>
                </div>
                <div class="lipeke-row">
                    <div class="fs-float-right">
                        <b>Observações:</b> ${observacoesText}
                    </div>
                </div>
                ${htmlCoordenacao}
                ${htmlSenar}
                ${htmlDevolutiva}
                <div class="lipeke-row" style="display: flex; gap: 10px; margin-top: 20px;">
                    <button class="lipeke-btn" style="width: 100%; background-color: #30a66d" id="processo_${id}">Abrir Solicitação</button>
                </div>
            </div>
        </div>
      `;
  }
}
