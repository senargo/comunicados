class ComunicadoController {
  constructor({ email, colleagueId, userData, cadastroOnly = false }) {
    this.email = email;
    this.colleagueId = colleagueId;
    this.userData = userData;
    this.cadastroOnly = cadastroOnly;
    this.data = [];
    this.page = 1;
    this.pageSize = ComunicadoConstants.PAGE_SIZE || 10;
    this.total = 0;
    this.processos = [];
    this.ciencias = [];
    this.agrupado = {};
    this.indiceCarregado = false;
    this.filters = { criadoPor: null };
    this.activities = {
      ATIVIDADE_CONFIRMAR_CIENCIA: 5,
      ATIVIDADE_ARQUIVAR: 12,
    };
    this.eventHandler = new ComunicadoEventHandler({ controller: this });
    this.view = new ComunicadoView({
      controller: this,
      eventHandler: this.eventHandler,
      skipFacade: true,
    });
    this.eventHandler.injectView(this.view);
    if (cadastroOnly) {
      return;
    }
    this.facade();
  }

  async facade() {
    await this.view.initOptMenu();
    this.eventHandler.bindFilterAdm();
    await this.loadData();
    this.view.initView();
  }

  async loadData(opcoes = {}) {
    const resetPage = opcoes.resetPage !== false;
    const recarregarIndice = opcoes.recarregarIndice !== false;
    if (resetPage) {
      this.page = 1;
    }
    const filters = this.view.getModalFiltersOptions();
    const precisaIndice = recarregarIndice || !this.indiceCarregado;
    try {
      if (precisaIndice) {
        ComunicadoService.cacheFichas = {};
        const par = await Promise.all([
          ComunicadoService.listarCienciasSafe(),
          ComunicadoService.listarProcessosGestor(),
        ]);
        this.ciencias = par[0];
        this.processos = par[1];
        this.agrupado = ComunicadoService.agruparCiencias(this.ciencias);
        this.indiceCarregado = true;
      }
      const result = await ComunicadoService.listar(filters, {
        page: this.page,
        pageSize: this.pageSize,
        ciencias: this.ciencias,
        processos: this.processos,
        agrupado: this.agrupado,
      });
      this.data = result.itens || [];
      this.total = result.total || 0;
      this.page = result.page || this.page;
      this.pageSize = result.pageSize || this.pageSize;
      if (!this.data.length && this.page === 1) {
        FluigUtils.toast({
          message: precisaIndice
            ? "Nenhum comunicado na grade. " +
              (ComunicadoService.lastListarInfo ||
                "A consulta de dsComunicadosListar / GestorConfirmarCiencia voltou vazia.")
            : "Nenhum comunicado encontrado com os filtros.",
          type: "warning",
        });
      }
    } catch (e) {
      this.data = [];
      this.total = 0;
      console.error("ComunicadoController.loadData", e);
      FluigUtils.toast({
        message: String(e.message || e),
        type: "error",
      });
    }
    return this.data;
  }

  async irParaPagina(page) {
    const totalPages = Math.max(1, Math.ceil((this.total || 0) / (this.pageSize || 10)));
    const destino = Math.max(1, Math.min(parseInt(page, 10) || 1, totalPages));
    if (destino === this.page && this.data && this.data.length) {
      return;
    }
    this.page = destino;
    try {
      await FluigUtils.initLoading("Aguarde", "Carregando página...", async () => {
        await this.loadData({ resetPage: false, recarregarIndice: false });
      });
    } catch (e) {
      console.error("ComunicadoController.irParaPagina", e);
    }
    this.view.initView();
  }

  atualizarGradeLocal(linha, acao) {
    if (this.cadastroOnly) {
      return;
    }
    const numero = String((linha && linha.NUMERO_PROCESSO) || "");
    const lista = this.data || [];
    const pageSize = this.pageSize || 10;
    this.atualizarIndiceLocal(linha, acao);
    if (acao === "excluir") {
      this.data = lista.filter((el) => String(el.NUMERO_PROCESSO) !== numero);
      this.total = Math.max(0, (this.total || 0) - 1);
    } else if (acao === "criar") {
      this.page = 1;
      this.total = (this.total || 0) + 1;
      this.data = [linha].concat(lista.filter((el) => String(el.NUMERO_PROCESSO) !== numero)).slice(0, pageSize);
    } else {
      var achou = false;
      this.data = lista.map((el) => {
        if (String(el.NUMERO_PROCESSO) !== numero) {
          return el;
        }
        achou = true;
        return Object.assign({}, el, linha);
      });
      if (!achou && linha) {
        this.page = 1;
        this.total = (this.total || 0) + 1;
        this.data = [linha].concat(this.data).slice(0, pageSize);
      }
    }
    this.view.initView();
  }

  atualizarIndiceLocal(linha, acao) {
    const numero = String((linha && linha.NUMERO_PROCESSO) || "");
    if (!numero) return;
    const doc = String((linha && linha.DOCUMENTID) || (linha && linha.documentid) || "");
    if (acao === "excluir") {
      this.processos = (this.processos || []).filter(
        (proc) => ComunicadoService.numeroDoProcesso(proc) !== numero
      );
      if (doc) {
        delete ComunicadoService.cacheFichas[doc];
      }
      return;
    }
    const proc = {
      processInstanceId: numero,
      processinstanceid: numero,
      "workflowProcessPK.processInstanceId": numero,
      processId: ComunicadoConstants.PROCESS_GESTOR,
      cardDocumentId: doc,
      documentId: doc,
      cardIndexDocumentId: (linha && linha.CARD_INDEX_DOCUMENT_ID) || "",
      startDate: (linha && (linha.DATA_CRIACAO || linha.DATA_INICIO)) || "",
      startDateProcess: (linha && (linha.DATA_CRIACAO || linha.DATA_INICIO)) || "",
      requesterId: (linha && linha.CRIADO_POR) || this.colleagueId || "",
      cardDescription: (linha && linha.TITULO) || "",
      processDescription: (linha && linha.TITULO) || "",
    };
    if (acao === "criar") {
      this.processos = [proc].concat(
        (this.processos || []).filter((row) => ComunicadoService.numeroDoProcesso(row) !== numero)
      );
    } else {
      var inseriu = false;
      this.processos = (this.processos || []).map(function (row) {
        if (ComunicadoService.numeroDoProcesso(row) !== numero) return row;
        inseriu = true;
        return Object.assign({}, row, proc);
      });
      if (!inseriu) {
        this.processos = [proc].concat(this.processos);
      }
    }
    if (doc) {
      ComunicadoService.cacheFichas[doc] = Object.assign({}, ComunicadoService.cacheFichas[doc] || {}, linha);
    }
  }

  validar(form) {
    if (!form.titulo) return "Informe o título.";
    if (!form.data_inicio) return "Informe a data de início.";
    if (form.sem_data_expiracao !== "S" && !form.data_fim) return "Informe a data de fim ou marque 'Sem data de expiração'.";
    if (form.sem_data_expiracao !== "S" && form.data_fim < form.data_inicio) return "A data de fim deve ser posterior à data de início.";
    if (form.agendamento_futuro === "S") {
      const today = new Date().toISOString().slice(0, 10);
      if (form.data_inicio <= today) return "Para agendamento futuro, a data de início deve ser posterior a hoje.";
    }
    if (form.publico_tipo !== "todos" && !form.publico_grupos.length && !form.publico_usuarios.length) {
      return "Selecione o público-alvo (todos, grupos e/ou usuários).";
    }
    if ((form.tipo_conteudo === "youtube" || form.tipo_conteudo === "link") && !form.url_conteudo) {
      return "Informe o link do conteúdo.";
    }
    if (form.tipo_conteudo !== "youtube" && form.tipo_conteudo !== "link" && !form.file && !form.documentos_anexos.length) {
      return "Anexe o arquivo do comunicado.";
    }
    return null;
  }

  async salvar(form, record, modal) {
    const erro = this.validar(form);
    if (erro) {
      FluigUtils.toast({ message: erro, type: "warning" });
      return;
    }

    const persist = async () => {
      let okMsg = "";
      try {
        await FluigUtils.initLoading("Aguarde", "Salvando comunicado...", async () => {
          if (form.file) {
            const uploaded = await ComunicadoService.uploadGed(form.file);
            form.documentos_anexos = [uploaded];
            form.tipo_conteudo = uploaded.tipoConteudo;
          } else if (form.tipo_conteudo === "youtube" || form.tipo_conteudo === "link") {
            form.tipo_conteudo = ComunicadoService.tipoPorUrl(form.url_conteudo);
          }

          var processId = record && record.NUMERO_PROCESSO;
          if (record) {
            if (record.STATUS === ComunicadoConstants.STATUS.CANCELADO || record.EXCLUIDO === "S") {
              throw "Comunicado cancelado ou excluído não pode ser editado.";
            }
            await ComunicadoService.editar(record, form);
            okMsg = "Comunicado " + (record.NUMERO_PROCESSO || "") + " atualizado.";
          } else {
            const fields = ComunicadoService.montarFormFields(form);
            processId = await ComunicadoService.criar(fields);
            okMsg = "Comunicado gravado no processo " + processId + ".";
          }

          modal.remove();
          FluigUtils.limparOverlayModal();

          if (!this.cadastroOnly) {
            this.atualizarGradeLocal(
              ComunicadoService.linhaDaGrade(form, record, {
                NUMERO_PROCESSO: processId,
                criar: !record,
              }),
              record ? "editar" : "criar"
            );
          }
        }, true);
        if (okMsg) {
          FluigUtils.toast({ message: okMsg, type: "success" });
        }
      } catch (e) {
        FluigUtils.fecharLoading();
        FluigUtils.toast({
          message: String(e.message || e),
          type: "error",
        });
      }
    };

    if (record && record.STATUS === "ATIVO") {
      FluigUtils.confirm({
        title: "Confirmar alteração",
        message: "Este comunicado já está publicado. As alterações serão aplicadas ao cadastro e aos destinatários ainda pendentes. Quem já deu ciência permanece registrado. Deseja continuar?",
        icon: "warning",
        confirmFunction: persist,
      });
      return;
    }

    persist();
  }

  cancelar(record) {
    if (!record) return;
    if (record.STATUS === ComunicadoConstants.STATUS.CANCELADO) {
      FluigUtils.toast({ message: "Este comunicado já está cancelado.", type: "warning" });
      return;
    }
    FluigUtils.confirm({
      title: "Cancelar comunicado",
      message:
        "O disparo de novas ciências será interrompido. Quem já recebeu o comunicado continua registrado. Deseja cancelar?",
      icon: "warning",
      confirmFunction: () => {
        FluigUtils.initLoading("Aguarde", "Cancelando comunicado...", async () => {
          await ComunicadoService.cancelar(record);
          this.atualizarGradeLocal(
            ComunicadoService.linhaDaGrade(null, record, {
              NUMERO_PROCESSO: record.NUMERO_PROCESSO,
              cancelado: "S",
              STATUS: ComunicadoConstants.STATUS.CANCELADO,
            }),
            "editar"
          );
        }, true)
          .then(() => {
            FluigUtils.toast({
              message: "Comunicado " + (record.NUMERO_PROCESSO || "") + " cancelado.",
              type: "success",
            });
          })
          .catch((e) => {
            FluigUtils.fecharLoading();
            FluigUtils.toast({
              message: String(e.message || e),
              type: "error",
            });
          });
      },
    });
  }

  excluir(record) {
    if (!record) return;
    FluigUtils.confirm({
      title: "Excluir comunicado",
      message:
        "O comunicado sairá da lista administrativa. O histórico de ciências não será apagado. Deseja excluir?",
      icon: "warning",
      confirmFunction: () => {
        FluigUtils.initLoading("Aguarde", "Excluindo comunicado...", async () => {
          await ComunicadoService.excluir(record);
          this.atualizarGradeLocal(
            { NUMERO_PROCESSO: record.NUMERO_PROCESSO },
            "excluir"
          );
        }, true)
          .then(() => {
            FluigUtils.toast({
              message: "Comunicado " + (record.NUMERO_PROCESSO || "") + " excluído da lista.",
              type: "success",
            });
          })
          .catch((e) => {
            FluigUtils.fecharLoading();
            FluigUtils.toast({
              message: String(e.message || e),
              type: "error",
            });
          });
      },
    });
  }

  async abrirPreview(record) {
    try {
      const preview = await FluigUtils.initLoading("Aguarde", "Carregando preview...", async () => {
        return ComunicadoService.montarPreview(record);
      }, true);
      this.view.openPreviewModal(preview);
    } catch (e) {
      FluigUtils.fecharLoading();
      FluigUtils.toast({
        message: String(e.message || e),
        type: "error",
      });
    }
  }

  async abrirCiencias(record) {
    try {
      await FluigUtils.initLoading("Aguarde", "Carregando auditoria de ciência...", async () => {
        const auditoria = await ComunicadoService.listarAuditoria(record);
        this.view.openCienciasModal(auditoria.resumo, auditoria.itens);
      }, true);
    } catch (e) {
      FluigUtils.fecharLoading();
      FluigUtils.toast({
        message: String(e.message || e),
        type: "error",
      });
    }
  }

  abrirProcesso(record) {
    FluigUtils.initLoading("Aguarde", "Obtendo link de acesso...", async () => {
      const url = FluigUtils.obterLink(record.NUMERO_PROCESSO);
      if (url) {
        FluigUtils.openUrl({ url, newWindow: true });
      } else {
        FluigUtils.toast({ message: "Processo não encontrado!", type: "warning" });
      }
    }, true);
  }
}
