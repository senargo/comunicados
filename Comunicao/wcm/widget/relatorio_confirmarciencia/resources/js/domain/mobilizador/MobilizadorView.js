class MobilizadorView {
  constructor({ controller, eventHandler, htmlBuilder }) {
    this.controller = controller;
    this.eventHandler = eventHandler;
    this.htmlBuilder = htmlBuilder || BaseHtmlBuilder;
    this.autoCompletes = {};
    this.facade();
  }

  async facade() {
    await this.initOptMenu();
    this.eventHandler.bindFilterAdm();
  }

  async initOptMenu() {
    const html = `
            <div class="lipeke-container">
                <div class="lipeke-row">
                    <div class="lipeke-panel">
                        <div class="lipeke-panel-header">
                            Filtros
                        </div>
                        <div class="lipeke-panel-content">
                            ${this.htmlBuilder.buildFiltersHtml(this.controller.types)}
                          
                            <div class="col-md-3 col-xs-12">
                                <br>
                                <button class="lipeke-btn" style="width: 100%;" id="doFilter">Filtrar Dados</button>
                            </div>
                            <div class="col-md-3 col-xs-12">
                                <br>
                                <button class="lipeke-btn" style="width: 100%; background-color: #3e75cf" id="doAdd">Novo Protocolo</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    $("#opt-items").html(html);
  }

  initView() {
    const tabChecked = $("li.active a").attr("href");
    const noFoundText = '`<h2 class="fs-text-center" style="margin: auto">Nenhuma solicitação foi encontrada com os filtros informados.</h2>`';
    let childrenData = {
      qtdSolicitacoes: 0,
      solicitacoes: "",
      qtdMinhasSolicitacoes: 0,
      minhasSolicitacoes: "",
    };

    if (this.controller.data.length > 0) {
      const childrenReceberNfList = this.controller.data;
      const childrenList = this.controller.data;
      childrenData = {
        qtdSolicitacoes: childrenReceberNfList.length,
        solicitacoes: childrenReceberNfList.map((el, id) => this.htmlBuilder.buildItemList(el, id, this.controller.activities)).join(""),
        qtdMinhasSolicitacoes: childrenList.length,
      };
    } else {
      childrenData.solicitacoes = noFoundText;
    }

    if (!childrenData.solicitacoes) childrenData.solicitacoes = noFoundText;

    const html = `
        <div class="lipeke-row">
            <div class="lipeke-panel">
                <div class="lipeke-panel-content">
                    <div class="lipeke-container" style="flex-wrap: wrap;margin-top: -10px;">
                        <ul class="nav nav-tabs nav-justified clearfix" id="tabNav" role="tablist" style="margin-bottom: 15px; width: 100%; display: none">
                            <li class="active">
                                <a href="tab-gerar">Solicitações
                                    <span class="label label-info">${childrenData.qtdSolicitacoes}</span>
                                </a>
                            </li>
                            <li>
                                <a href="tab-demais">Pendentes Ação
                                    <span class="label label-info">${childrenData.qtdMinhasSolicitacoes}</span>
                                </a>
                            </li>
                        </ul>
                        <div id="tab-gerar" class="lipeke-auto-boxes-inline" style="width: 100%; justify-content: space-evenly;">
                                ${childrenData.solicitacoes}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;

    $("#content-inject").html(html);
    FluigUtils.initNav("#tabNav");
    this.eventHandler.bindClickOnList();
    $(`a[href=${tabChecked}]`).trigger("click");
  }

  getModalFiltersOptions() {
    let dtInicial = $("#ftInicial").val();
    let dtFinal = $("#ftFinal").val();
    let numeroDocumento = $("#ftNroDoc").val();
    let assuntoObservacao = $("#ftAssuntoObs").val();
    let selectedStatus = $("#status").val();

    let codigo_mobilizador = this.controller.mobilizadorData.CODCFO;

    /**
     * <option value="" selected="">Todos</option>
      <option value="1">Análise Coordenação Regional</option>
      <option value="2">Análise Senar</option>
      <option value="3">Corrigir</option>
      <option value="4">Protocolado</option>
      <option value="5">Visualizar devolutiva</option>
      <option value="6">Encerrado</option>
     */
    let statusFilterValue = null;
    switch (parseInt(selectedStatus)) {
      case 1:
        statusFilterValue = this.controller.activities.ATIVIDADE_ANALISE_REGIONAL;
        break;
      case 2:
        statusFilterValue = this.controller.activities.ATIVIDADE_ANALISE_SENAR;
        break;
      case 3:
        statusFilterValue = this.controller.activities.ATIVIDADE_CORRIGIR;
        break;
      case 4:
        statusFilterValue = this.controller.activities.ATIVIDADE_RECEBER_RESPOSTA;
        break;
      case 5:
        statusFilterValue = this.controller.activities.ATIVIDADE_VISUALIZAR_DEVOLUTIVA;
        break;
      case 5:
        statusFilterValue = this.controller.activities.ATIVIDADE_VISUALIZAR_DEVOLUTIVA;
        break;
      case 6:
        statusFilterValue = this.controller.activities.ATIVIDADE_ARQUIVAR;
        break;

      default:
        statusFilterValue = null;
        break;

    }

    let filters = [
      {
        field: "documento_data",
        initialValue: dtInicial,
        finalValue: dtFinal,
      },
      {
        field: "documento_numero",
        initialValue: numeroDocumento,
        type: ConstraintType.MUST,
        likeSearch: true,
      },
      {
        field: "documento_assunto_observacao",
        initialValue: assuntoObservacao,
        type: ConstraintType.MUST,
        likeSearch: true,
      },
      {
        field: "num_seq_estado",
        initialValue: statusFilterValue
      },
      {
        field: "parceiro_codigo",
        initialValue: codigo_mobilizador,
        type: ConstraintType.MUST,
      }
    ];

    return filters
      .filter((f) => f.initialValue !== "" && f.initialValue !== undefined && f.initialValue !== null)
      .reduce((acc, cur) => {
        acc[cur.field] = {
          initialValue: cur.initialValue,
          finalValue: cur.finalValue || null,
        };
        if (cur.type) acc[cur.field].type = cur.type;
        if (cur.likeSearch) acc[cur.field].likeSearch = cur.likeSearch;
        return acc;
      }, {});
  }
}
