class RecursosHumanosController {
  constructor({ email, colleagueId, userData }) {
    this.email = email;
    this.colleagueId = colleagueId;
    this.userData = userData;
    this.data = [];
    this.mobilizadorData = {};
    this.activities = {
      ATIVIDADE_NOVO: 0,
      ATIVIDADE_INICIO: 4,
      ATIVIDADE_CONFIRMAR_CIENCIA: 5,
      ATIVIDADE_ARQUIVAR: 12,
      ATIVIDADE_REJEITAR: 20,
      ATIVIDADE_IGNORAR: 17,
    };

    this.eventHandler = new RecursosHumanosEventHandler({ controller: this });
    this.filters = {
      dtInicial: '',
      dtFinal: '',
      tipoDocumento: '',
      numeroDocumento: '',
      assunto: '',
      codMunicipio: '',
      codOrigem: '',
      descricao: '',
      userCode: '',
    };
    this.view = new RecursosHumanosView({ controller: this, eventHandler: this.eventHandler, htmlBuilder: RecursosHumanosHtmlBuilder });
    this.facade();

  }

  async facade() {
    
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

  async getMobilizadorData(){
    const mobilizadorData = await FluigUtils.genericRestDatasetCall({
      dataset: "rm_mobilizador",
      constraints: {
        EMAIL: this.email,
      },
    });

    if(!mobilizadorData || mobilizadorData.length === 0) {
      FluigUtils.showMessage({
        type: 'error',
        message: 'Mobilizador inativo ou parceiro inativado. Contate a equipe de suporte.'
      })
      this.mobilizadorData = null;
      return;
    }

    this.mobilizadorData = mobilizadorData?.[0];
  }

  async loadData() {
    return new Promise((resolve) => {
      FluigUtils.initLoading('Aguarde', 'Carregando informações...', async () => {
        const filterOptions = this.view.getModalFiltersOptions()
        const data = await FluigUtils.genericRestDatasetCallV2({
          dataset: 'dsComunicadosListar',
          constraints: filterOptions
        })

        this.data = data.filter(el => {
          
          return true;
        })
        resolve(this.data)
      }, true)
    });
  }

  openNovoComunicado() {
    if (!this.cadastroComunicado) {
      this.cadastroComunicado = new ComunicadoController({
        email: this.email,
        colleagueId: this.colleagueId,
        userData: this.userData,
        cadastroOnly: true,
      });
    }
    this.cadastroComunicado.view.openModal(null);
  }
}
