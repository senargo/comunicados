class RecursosHumanosEventHandler {
    constructor({ controller }) {
        this.controller = controller;
        this.view = null;
    }

    injectView(view) {
        this.view = view;
    }

    bindFilterAdm() {
        $("#doFilter").on('click', async () => {
            await this.controller.loadData();
            this.view.initView();
        })

        $("#doAdd").on('click', () => this.controller.openNovoComunicado())
    }

    bindClickOnList() {
        this.controller.data.forEach((el, id) => {
            let anexos_json = [];
            try {
                anexos_json = JSON.parse(el.DOCUMENTOS_ANEXOS || "[]");
            } catch (error) {
                console.error("Erro ao fazer parse do DOCUMENTOS_ANEXOS:", error);
            }

            if(anexos_json){
                anexos_json.map(anexo => {
                    $(`#el_documentoAnexo_${anexo.documentId}`).on('click', () => {
                        FluigUtils.initLoading('Aguarde', 'Abrindo documento', async () => {
                            FluigUtils.openDocument(anexo.documentId, anexo.documentVersion || 1000, anexo.documentDescription);
                        })
                    })
                });
            }

            $(`#processo_${id}`).on('click', () => {
                FluigUtils.initLoading('Aguarde', 'Obtendo link de acesso...', async () => {
                    const url = FluigUtils.obterLink(el.NUMERO_PROCESSO);
                    if (url) {
                        FluigUtils.openUrl({ url: url, newWindow: true });
                    } else {
                        alert('Processo não encontrado!');
                    }
                })
            })            
            
        })
    }

    setValue(object) {
        Object.keys(object).forEach(key => $(`#${key}`).val(object[key] || ''))
    }

    triggerChange(object) {
        object.forEach(key => $(`#${key}`).trigger('change'))
    }

    setCheckbox(object) {
        Object.keys(object).forEach(key => $(`#${key}`).prop('checked', object[key]))
    }

}
