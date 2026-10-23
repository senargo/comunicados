class ComunicadoView {
  constructor({ controller, eventHandler, skipFacade = false }) {
    this.controller = controller;
    this.eventHandler = eventHandler;
    this.htmlBuilder = ComunicadoHtmlBuilder;
    if (!skipFacade) {
      this.facade();
    }
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
            <div class="lipeke-panel-header">Filtros</div>
            <div class="lipeke-panel-content">
              ${this.htmlBuilder.buildFiltersHtml()}
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

    try {
      LipekeUtils.initAutocompleteDs({
        label: "Criado por",
        id: "usuario_fluig",
        addSearchIcon: true,
        fetchParams: {
          dataset: "rm_jdbc_consultaColleaguePessoaRM",
          searchField: "NOME",
          label: "NOME",
          resultFields: ["NOME", "USER_CODE"],
        },
        onAdd: (data) => {
          this.controller.filters.criadoPor = data.USER_CODE;
        },
        onRemove: () => {
          this.controller.filters.criadoPor = null;
        },
      });
    } catch (e) {
      console.error("ComunicadoView.initOptMenu autocomplete", e);
    }
  }

  initView() {
    $("#content-inject").html(`
      <div class="lipeke-row">
        <div class="lipeke-panel">
          <div class="lipeke-panel-header" style="width: 100%;">Lista de Comunicados</div>
          <div class="lipeke-panel-content">
            ${this.htmlBuilder.buildGrid(this.controller.data)}
            ${this.htmlBuilder.buildPaginacao({
              page: this.controller.page,
              total: this.controller.total,
              pageSize: this.controller.pageSize,
            })}
          </div>
        </div>
      </div>
    `);
    $("#qtdRegistros").text(`${this.controller.total || 0} registro(s)`);
    this.eventHandler.bindGridActions();
    this.eventHandler.bindPaginacao();
  }

  getModalFiltersOptions() {
    return {
      titulo: $("#ftTitulo").val()?.trim() || "",
      data_inicial: ComunicadoService.isoDate($("#ftInicial").val()),
      data_final: ComunicadoService.isoDate($("#ftFinal").val()),
      criado_por: this.controller.filters.criadoPor || "",
      status: $("#ftStatus").val() || "",
      expiracao: $("#ftExpiracao").val() || "",
      aceite: $("#ftAceite").val() || "",
    };
  }

  openModal(record) {
    const isEdit = !!record;
    FLUIGC.modal(
      {
        title: isEdit ? "Editar Comunicado" : "Novo Comunicado",
        content: this.htmlBuilder.buildModalHtml(record || {}),
        id: "modalComunicado",
        size: "large",
      },
      () => {
        $("#modalComunicado").find('button.close[data-dismiss="modal"]').hide();
        this.eventHandler.bindModal(
          {
            remove: () => FluigUtils.limparOverlayModal(),
          },
          record
        );
      }
    );
  }

  openPreviewModal(preview) {
    const botao = preview.TEXTO_BOTAO_ACAO || ComunicadoConstants.BOTAO_PADRAO;
    FLUIGC.modal(
      {
        title: `Preview — ${preview.TITULO || preview.NUMERO_PROCESSO}`,
        content: this.htmlBuilder.buildPreviewHtml(preview),
        id: "modalComunicadoPreview",
        size: "large",
        actions: [
          {
            label: botao,
            bind: "data-com-preview-fechar",
            classType: "btn-success",
            autoClose: true,
          },
        ],
      },
      () => {
        this.htmlBuilder.pintarPreviewMidia(preview);
        $("[data-com-preview-fechar]").off("click.compreview").on("click.compreview", () => {
          try {
            $("#modalComunicadoPreview").modal("hide");
          } catch (eHide) {}
        });
      }
    );
  }

  openCienciasModal(record, ciencias) {
    FLUIGC.modal({
      title: `Auditoria de ciência — ${record.TITULO || record.NUMERO_PROCESSO}`,
      content: this.htmlBuilder.buildCienciasHtml(ciencias, record),
      id: "modalCiencias",
      size: "large",
    });
  }
}
