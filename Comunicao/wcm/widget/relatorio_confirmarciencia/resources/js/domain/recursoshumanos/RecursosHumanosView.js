class RecursosHumanosView {
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
                                <button class="lipeke-btn" style="width: 100%; background-color: #3e75cf" id="doAdd">Novo Comunicado</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    $("#opt-items").html(html);

    
    LipekeUtils.initAutocompleteDs({
      label: 'Usuário',
      id: 'usuario_fluig',
      addSearchIcon: true,
      fetchParams: {
          dataset: 'rm_jdbc_consultaColleaguePessoaRM',
          searchField: 'NOME',
          label: 'NOME',
          resultFields: ['NOME', 'USER_CODE']
      },
      onAdd: (data) => {
          this.controller.filters.userCode = data.USER_CODE
      },
      onRemove: () => {
          this.controller.filters.userCode = null;
      },
    });
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
    let assuntoObservacao = $("#ftAssunto").val();
    let descricao = $("#ftDescricao").val();
    let selectedStatus = $("#status").val();

    let codigo_mobilizador = this.controller.mobilizadorData.CODCFO;

    let userCode = this.controller.filters.userCode || null;


    /**
     * 
      ATIVIDADE_INICIO: 4,
      ATIVIDADE_CONFIRMAR_CIENCIA: 5,
      ATIVIDADE_ARQUIVAR: 12,
      ATIVIDADE_REJEITAR: 20,
      ATIVIDADE_IGNORAR: 17,
     */
    let statusFilterValue = null;
    switch (parseInt(selectedStatus)) {
      case 5:
        statusFilterValue = this.controller.activities.ATIVIDADE_CONFIRMAR_CIENCIA;
        break;
      case 12:
        statusFilterValue = this.controller.activities.ATIVIDADE_ARQUIVAR;
        break;
      case 20:
        statusFilterValue = this.controller.activities.ATIVIDADE_REJEITAR;
        break;
      case 17:
        statusFilterValue = this.controller.activities.ATIVIDADE_IGNORAR;
        break;

      default:
        statusFilterValue = null;
        break;

    }
 
    let filters = [
      {
        field: "data_solicitacao",
        initialValue: dtInicial,
        finalValue: dtFinal,
      },
      {
        field: "numerodocumento",
        initialValue: numeroDocumento,
        type: ConstraintType.MUST,
        likeSearch: true,
      },
      {
        field: "assunto",
        initialValue: assuntoObservacao,
        type: ConstraintType.MUST,
        likeSearch: true,
      },
      {
        field: "observacao",
        initialValue: descricao,
        type: ConstraintType.MUST,
      },
      {
        field: "user_code",
        initialValue: userCode,
        type: ConstraintType.MUST,
      },
      {
        field: "num_seq_estado",
        initialValue: statusFilterValue
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
