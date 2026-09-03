class BaseView {
    constructor({ controller, eventHandler, htmlBuilder }) {
        this.controller = controller;
        this.eventHandler = eventHandler;
        this.htmlBuilder = htmlBuilder || BaseHtmlBuilder
        this.autoCompletes = {
            regional: null,
            entidade: null,
            linhaAcao: null,
            treinamento: null,
        };
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


        LipekeUtils.initAutocompleteDs({
            label: "Município",
            id: "ftMunicipio",
            isRequired: true,
            addSearchIcon: true,
            fetchParams: {
                dataset: "rm_jdbc_cidades",
                searchField: "FILTER",
                label: "descricao",
                resultFields: ["codigo_municipio", "nome_municipio", "nome_estado"],
            },
            onAdd: (data) => {
                $("#municipio").val(data.codigo_municipio)
            },
            onRemove: () => {
                $("#municipio").val('')
            },
        });

        LipekeUtils.initAutocompleteDs({
            label: "Origem",
            id: "ftOrigem",
            isRequired: true,
            addSearchIcon: true,
            fetchParams: {
                dataset: "protocolo_senar_origem",
                searchField: "FILTER",
                label: "nome",
                resultFields: ["codigo", "nome"],
            },
            onAdd: (data) => {
                $("#origem").val(data.codigo)
            },
            onRemove: () => {
                $("#origem").val('')
            },
        });
    }

    initView() {
        const tabChecked = $("li.active a").attr('href')
        const noFoundText = '`<h2 class="fs-text-center" style="margin: auto">Nenhuma solicitação foi encontrada com os filtros informados.</h2>`'
        let childrenData = {
            qtdSolicitacoes: 0,
            solicitacoes: '',
            qtdMinhasSolicitacoes: 0,
            minhasSolicitacoes: ''
        }

        if (this.controller.data.length > 0) {
            const childrenReceberNfList = this.controller.data;
            const childrenList = this.controller.data;
            childrenData = {
                qtdSolicitacoes: childrenReceberNfList.length,
                solicitacoes: childrenReceberNfList.map((el, id) => this.htmlBuilder.buildItemList(el, id, this.controller.group)).join(""),
                qtdMinhasSolicitacoes: childrenList.length,
            }

        } else {
            childrenData.solicitacoes = noFoundText;
        }

        if (!childrenData.solicitacoes) childrenData.solicitacoes = noFoundText

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
        $(`a[href=${tabChecked}]`).trigger('click')
    }

    getModalFiltersOptions() {
        return {
            numero_processo: 979963
        };
    }

}
