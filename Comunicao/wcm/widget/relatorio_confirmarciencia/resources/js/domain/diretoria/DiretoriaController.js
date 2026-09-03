class DiretoriaController {
  constructor({ email, colleagueId, userData }) {
    this.email = email;
    this.colleagueId = colleagueId;
    this.userData = userData;
    this.data = [];
    this.diretoriaData = {};
    this.activities = {
      ATIVIDADE_NOVO: 0,
      ATIVIDADE_INICIO: 4,
      ATIVIDADE_ANALISE_REGIONAL: 51,
      ATIVIDADE_ANALISE_SENAR: 16,
      ATIVIDADE_CORRIGIR: 18,
      ATIVIDADE_CRIAR_PROTOCOLO: 10,
      ATIVIDADE_SINAL: 31,
      ATIVIDADE_RECEBER_RESPOSTA: 37,
      ATIVIDADE_VISUALIZAR_DEVOLUTIVA: 23,
      ATIVIDADE_ARQUIVAR: 44,
      ATIVIDADE_ARQUIVAR2: 13,
      ATIVIDADE_FINALIZAR_RASCUNHO: 30,
    };

    this.eventHandler = new DiretoriaEventHandler({ controller: this });
    this.filters = {
      dtInicial: '',
      dtFinal: '',
      tipoDocumento: '',
      numeroDocumento: '',
      assunto: '',
      codMunicipio: '',
      codigoParceiro: null,
    };
    FluigUtils.genericRestDatasetCall({
      dataset: 'protocolo_senar_tipos_doc'
    }).then(getTypes => {
      this.types = getTypes;
      this.view = new DiretoriaView({ controller: this, eventHandler: this.eventHandler, htmlBuilder: DiretoriaHtmlBuilder });
      this.facade();
    })

  }

  async facade() {
    
    await this.getDiretoriaData();
    await this.loadData();
    this.eventHandler.injectView(this.view);
    this.view.initView();
  }

  getQueryParams() {
    return decodeURI(window.location.search)
      .replace('?', '')
      .split('&')
      .map(param => param.split('='))
      .reduce((values, [key, value]) => {
        if (value) values[key] = value
        return values
      }, {})
  }

  async getDiretoriaData(){
    const diretoriaData = await FluigUtils.genericRestDatasetCall({
      dataset: "rm_mobilizador",
      constraints: {
        EMAIL: this.email,
      },
    });

    this.diretoriaData = diretoriaData?.[0];
  }

  async loadData() {
    return new Promise((resolve) => {
      FluigUtils.initLoading('Aguarde', 'Carregando informações...', async () => {
        const filterOptions = this.view.getModalFiltersOptions()
        const data = await FluigUtils.genericRestDatasetCallV2({
          dataset: 'protocololistarProtocolarOficioSuper',
          constraints: filterOptions
        })

        this.data = data.filter(el => {
          
          return true;
        })
        resolve(this.data)
      }, true)
    });
  }
}
