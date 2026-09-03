class AppView {
  constructor({ controller }) {
    this.controller = controller;
    this.defaultColor = "#008000";
    this.animationTime = 2000;
    this.facade();
  }

  facade() {
    this.initView();
  }

  initView() {
    $("h2.pageTitle").parents().eq(0).remove();
    $(".menu-item")
      .css({
        "text-align": "center",
        border: "none",
        "margin-bottom": "50px",
      })
      .find(".fluigicon, .flaticon, .icone-titulo")
      .css({ cursor: "pointer", color: this.defaultColor });

    $("#main-icon").css({ color: this.defaultColor });
  }

  getNoPermissionView() {
    return `
      <div>
          <h2 class="fs-text-center">Usuário sem permissão</h2>
      </div>`;
  }

  static getDefaultSystemView(title) {
    return `
        <div class="panel">
            <div class="panel-heading">
                <h5 class="panel-title fs-text-center" style="font-size: 24px;">
                    <span id="contentTitle">${title} <span id="extraContentTitle"></span></span>
                    <span style="float: right" id="qtdRegistros"></span>
                </h5>
            </div>
        </div>
        <div id="injection-container-contet">
          <div id="main-items">
            <!-- Onde será injetado o conteúdo da página prinicpal -->
            <div id="opt-items">
              <!-- Onde será injetado opções adicionais -->
            </div>
            <div id="content-inject">
              <!-- Onde será injetado o conteúdo da página -->
            </div>
            <div id="hooksDiv" class="lipeke-floatingButton">
              <!-- Onde serão injetados os hooks (botões flutuantes) -->
            </div>
          </div>
        </div>
        <div id="act-items" style="display: none;">
          <!-- Onde será injetado o conteúdo de onde a pessoa ficar clicando -->
        </div>
      `;
  }

  static async showActItens(hideAnimation) {
    $("#injection-container-contet").hide("slide", { direction: "left" }, hideAnimation ? 0 : this.animationTime, async () => {
      $("#act-items").show("slide", { direction: "right" }, hideAnimation ? 0 : this.animationTime);
    });
  }

  static async showContainerContent(anchor) {
    $("#act-items").hide("slide", { direction: "right" }, this.animationTime, async () => {
      $("#injection-container-contet").show("slide", { direction: "left" }, this.animationTime);
      $("#act-items").html("");
      $([document.documentElement, document.body]).animate(
        {
          scrollTop: $(anchor).position().top,
        },
        10
      );
    });
  }

  async getDebugMode() {
    return new Promise((resolve) => {
      FluigUtils.confirm({
        title: "Modo Debug",
        message: `
          <div class="lipeke-container">
              <div class="lipeke-col" style="width: 100%; justify-content: space-between;;">
                  <div class="col-xs-12 col-md-12">
                     Deseja utilizar o modo debug?
                  </div>
                  <div class="fluig-style-guide">
                    <div class="col-xs-12 col-md-8 col-md-offset-2" style="margin-top: 20px">
                        <div class="lipeke-input-group">
                            <select id="modoDebugOption">
                              ${Object.keys(this.controller.debugModeOptions)
                                .map(
                                  (key) => `
                                  <option value="${key}">${this.controller.debugModeOptions[key].optionName}</option>
                              `
                                )
                                .join("")}
                            </select>
                            <label>Perfil de Acesso</label>
                        </div>
                    </div>
                  </div>
              </div>
          </div>          
          `,
        confirmFunction: () => {
          const optionSelected = $("#modoDebugOption").val();
          resolve(optionSelected);
        },
        cancelFunction: () => resolve(null),
        isHtml: true,
        icon: "info",
      });
    });
  }

  async showDebug({ text, dataset, filters, defaultValue }) {
    return new Promise((resolve) => {
      if (defaultValue) {
        this.controller.debugData = defaultValue;
      }

      const defaultValueEmail = defaultValue?.EMAIL ? defaultValue.EMAIL : "";

      const html = `
          <div class='row'>
              <div class='col-xs-12 col-md-12'>
                  <h5 class="fs-text-center">${text}</h5>
              </div>
          </div>
          <div class='row'>
              <div class='col-xs-12 col-md-12'>
                  <div class="lipeke-input-group">
                      <div id='debugName'></div>
                  </div>
              </div>
          </div>
          <div class='row'>
              <div class='col-xs-12 col-md-12'>
                  <div class='lipeke-input-group'>
                      <input type='text' id='debugEmail' placeholder="" value="${defaultValueEmail}">
                      <label>Email</label>
                  </div>
              </div>
          </div>
          <div class="row">
              
              <div class="col-md-6 col-xs-12" style="margin-top: 10px; text-align: center;">
                  <button type="button" class="lipeke-btn" id="btnCancelar">Cancelar</button>
              </div>
  
              <div class="col-md-6 col-xs-12" style="margin-top: 10px; text-align: center;">
                  <button type="button" class="lipeke-btn success" id="btnDebug">Acessar</button>
              </div>
  
          </div>
        `;
      const myModal = FLUIGC.modal(
        {
          title: "Modo Debug",
          content: html,
          id: "fluig-modal",
        },
        () => {
          $("[data-dismiss='modal']").hide();

          LipekeUtils.initAutocompleteDs({
            label: "Nome",
            id: "debugName",
            addSearchIcon: true,
            fetchParams: {
              dataset: dataset,
              searchField: filters.search,
              label: filters.label,
              filterFields: filters.filter,
              resultFields: filters.result,
            },
            onAdd: (data) => {
              $("#debugEmail").val(data.EMAIL);
              this.controller.debugData = data;
            },
            onRemove: () => {
              $("#debugEmail").val("");
              this.controller.debugData = null;
            },
          });

          $("#debugEmail").on("blur", async () => {
            const email = $("#debugEmail").val();

            if (email) {
              const data = await FluigUtils.genericRestDatasetCall({
                dataset: dataset,
                fields: null,
                constraints: {
                  EMAIL: email,
                },
              });

              if (data?.[0]?.EMAIL == email) {
                $("#debugName").val(data[0].NOME_PESSOA);
                this.controller.debugData = data[0];
              } else {
                this.controller.debugData = null;
              }
            } else {
              this.controller.debugData = null;
            }
          });

          $("#btnDebug").on("click", async () => {
            if (this.controller.debugData?.EMAIL) {
              const email = $("#debugEmail").val();
              myModal.remove();
              resolve(email);
            } else {
              FluigUtils.toast({
                message: "Antes de continuar, selecione o usuário na listagem ou então informe um email válido.",
                type: "warning",
              });
            }
          });

          $("#btnCancelar").on("click", async () => {
            myModal.remove();
            resolve(null);
          });
        }
      );
    });
  }

  async showPerfilAcessoSelector(options) {
    return new Promise((resolve) => {
      FluigUtils.confirm({
        title: "Financeiro Online",
        message: `
        <div class="lipeke-container">
            <div class="lipeke-col" style="width: 100%; justify-content: space-between;;">
                <div class="col-xs-12 col-md-12">
                    Deseja acessar com qual perfil?
                </div>
                  <div class="col-xs-12 col-md-12" style="margin-top: 20px">
                      <div class="lipeke-input-group">
                          <select id="perfilAcesso">
                              <option value="" selected disabled></option>
                              ${options
                                .map(
                                  (el) => `
                              <option value="${el.permission}">${this.controller.debugModeOptions[el.permission].optionName}</option>
                              `
                                )
                                .join("")}
                          </select>
                          <label>Perfil de Acesso</label>
                      </div>
                  </div>
                </div>
            </div>
        </div>          
        `,
        confirmFunction: () => {
          const optionSelected = $("#perfilAcesso").val();
          resolve(optionSelected);
        },
        cancelFunction: () => resolve(null),
        isHtml: true,
        icon: "info",
      });
    });
  }
}
