class ComunicadoEventHandler {
  constructor({ controller }) {
    this.controller = controller;
    this.view = null;
    this.modalState = null;
  }

  injectView(view) {
    this.view = view;
  }

  bindFilterAdm() {
    $("#doFilter").on("click", async () => {
      await this.controller.loadData({ recarregarIndice: false, resetPage: true });
      this.view.initView();
    });

    $("#doAdd").on("click", () => this.view.openModal(null));
  }

  bindGridActions() {
    $(".btn-editar").on("click", (ev) => {
      ev.stopPropagation();
      const record = this.controller.data[$(ev.currentTarget).data("index")];
      if (record) this.view.openModal(record);
    });

    $(".btn-cancelar").on("click", (ev) => {
      ev.stopPropagation();
      const record = this.controller.data[$(ev.currentTarget).data("index")];
      if (record) this.controller.cancelar(record);
    });

    $(".btn-excluir").on("click", (ev) => {
      ev.stopPropagation();
      const record = this.controller.data[$(ev.currentTarget).data("index")];
      if (record) this.controller.excluir(record);
    });

    $(".btn-abrir").on("click", (ev) => {
      ev.stopPropagation();
      const record = this.controller.data[$(ev.currentTarget).data("index")];
      if (record) this.controller.abrirProcesso(record);
    });

    $(".btn-preview").on("click", async (ev) => {
      ev.stopPropagation();
      const record = this.controller.data[$(ev.currentTarget).data("index")];
      if (record) await this.controller.abrirPreview(record);
    });

    $(".btn-detalhe").on("click", async (ev) => {
      ev.stopPropagation();
      const record = this.controller.data[$(ev.currentTarget).data("index")];
      if (record) await this.controller.abrirCiencias(record);
    });
  }

  bindPaginacao() {
    const ctrl = this.controller;
    const totalPages = Math.max(1, Math.ceil((ctrl.total || 0) / (ctrl.pageSize || 10)));
    $("#comPagPrimeira").off("click").on("click", () => ctrl.irParaPagina(1));
    $("#comPagAnt").off("click").on("click", () => ctrl.irParaPagina((ctrl.page || 1) - 1));
    $("#comPagProx").off("click").on("click", () => ctrl.irParaPagina((ctrl.page || 1) + 1));
    $("#comPagUltima").off("click").on("click", () => ctrl.irParaPagina(totalPages));
  }

  bindModal(modal, record) {
    this.modalState = {
      modal,
      record,
      publicoGrupos: this.parseList(record?.PUBLICO_GRUPOS),
      publicoUsuarios: this.parseList(record?.PUBLICO_USUARIOS),
      excecaoGrupos: this.parseList(record?.EXCECAO_GRUPOS),
      excecaoUsuarios: this.parseList(record?.EXCECAO_USUARIOS),
      anexos: this.parseList(record?.DOCUMENTOS_ANEXOS),
    };

    if (record?.TIPO_CONTEUDO) {
      $("#comTipo").val(record.TIPO_CONTEUDO);
    }
    this.toggleConteudoFields();
    this.renderChips();
    this.bindAutocompletes();

    if (this.modalState.anexos[0]?.documentDescription) {
      $("#comArquivoAtual").text("Anexo atual: " + this.modalState.anexos[0].documentDescription);
    }

    $("#comTipo").on("change", () => this.toggleConteudoFields());
    $("#comSemExpiracao").on("change", () => {
      $("#comFim").prop("disabled", $("#comSemExpiracao").is(":checked"));
    }).trigger("change");

    $("#comTodos").on("change", () => {
      const todos = $("#comTodos").is(":checked");
      $("#comGrupo, #comUsuario").closest(".col-md-6").css("opacity", todos ? 0.5 : 1);
    }).trigger("change");

    $("#comCancelarModal").off("click").on("click", () => modal.remove());
    $("#comSalvarModal").off("click").on("click", () => this.controller.salvar(this.collectForm(), record, modal));
  }

  bindAutocompletes() {
    this.initZoom("comGrupo", "Grupo", "group", "groupDescription", "groupDescription", ["groupId", "groupDescription"], (item) => {
      this.addUnique("publicoGrupos", { groupId: item.groupId, groupDescription: item.groupDescription }, "groupId");
      $("#comGrupo").val("");
    });
    this.initZoom("comUsuario", "Usuário", "rm_jdbc_consultaColleaguePessoaRM", "NOME", "NOME", ["NOME", "USER_CODE"], (item) => {
      this.addUnique("publicoUsuarios", { USER_CODE: item.USER_CODE, NOME: item.NOME, colleagueName: item.NOME }, "USER_CODE");
      $("#comUsuario").val("");
    });
    this.initZoom("comExcGrupo", "Exceção de grupo", "group", "groupDescription", "groupDescription", ["groupId", "groupDescription"], (item) => {
      this.addUnique("excecaoGrupos", { groupId: item.groupId, groupDescription: item.groupDescription }, "groupId");
      $("#comExcGrupo").val("");
    });
    this.initZoom("comExcUsuario", "Exceção de usuário", "rm_jdbc_consultaColleaguePessoaRM", "NOME", "NOME", ["NOME", "USER_CODE"], (item) => {
      this.addUnique("excecaoUsuarios", { USER_CODE: item.USER_CODE, NOME: item.NOME, colleagueName: item.NOME }, "USER_CODE");
      $("#comExcUsuario").val("");
    });
  }

  initZoom(id, label, dataset, searchField, fieldLabel, resultFields, onAdd) {
    LipekeUtils.initAutocompleteDs({
      label,
      id,
      addSearchIcon: true,
      fetchParams: { dataset, searchField, label: fieldLabel, resultFields },
      onAdd,
    });
  }

  addUnique(listName, item, key) {
    const list = this.modalState[listName];
    if (!item[key] || list.some((el) => el[key] === item[key])) {
      return;
    }
    list.push(item);
    this.renderChips();
  }

  renderChips() {
    const paint = (container, list, key, labelKey, type) => {
      $(container).html(
        list.map((el) => ComunicadoHtmlBuilder.chip(el[labelKey] || el[key], el[key], type)).join("")
      );
    };

    paint("#comGruposChips", this.modalState.publicoGrupos, "groupId", "groupDescription", "publicoGrupos");
    paint("#comUsuariosChips", this.modalState.publicoUsuarios, "USER_CODE", "NOME", "publicoUsuarios");
    paint("#comExcGruposChips", this.modalState.excecaoGrupos, "groupId", "groupDescription", "excecaoGrupos");
    paint("#comExcUsuariosChips", this.modalState.excecaoUsuarios, "USER_CODE", "NOME", "excecaoUsuarios");

    $(".com-chip i").off("click").on("click", (ev) => {
      const chip = $(ev.currentTarget).closest(".com-chip");
      const type = chip.data("type");
      const key = String(chip.data("key"));
      this.modalState[type] = this.modalState[type].filter((el) => String(el.groupId || el.USER_CODE) !== key);
      this.renderChips();
    });
  }

  toggleConteudoFields() {
    const tipo = $("#comTipo").val();
    const isLink = tipo === "youtube" || tipo === "link";
    $("#comUrlWrap").toggle(isLink);
    $("#comUploadWrap").toggle(!isLink);
  }

  collectForm() {
    const tipo = $("#comTipo").val();
    const todos = $("#comTodos").is(":checked");
    let publicoTipo = "todos";
    if (!todos) {
      const hasGroups = this.modalState.publicoGrupos.length > 0;
      const hasUsers = this.modalState.publicoUsuarios.length > 0;
      if (hasGroups && hasUsers) publicoTipo = "combinacao";
      else if (hasGroups) publicoTipo = "grupos";
      else if (hasUsers) publicoTipo = "usuarios";
    }

    return {
      titulo: $("#comTitulo").val()?.trim(),
      descricao: $("#comDescricao").val()?.trim(),
      data_inicio: $("#comInicio").val(),
      data_fim: $("#comFim").val(),
      sem_data_expiracao: $("#comSemExpiracao").is(":checked") ? "S" : "N",
      exibir_popup: $("#comPopup").is(":checked") ? "S" : "N",
      agendamento_futuro: $("#comAgendar").is(":checked") ? "S" : "N",
      texto_botao_acao: $("#comBotao").val()?.trim() || ComunicadoConstants.BOTAO_PADRAO,
      publico_tipo: publicoTipo,
      publico_grupos: this.modalState.publicoGrupos,
      publico_usuarios: this.modalState.publicoUsuarios,
      excecao_grupos: this.modalState.excecaoGrupos,
      excecao_usuarios: this.modalState.excecaoUsuarios,
      tipo_conteudo: tipo,
      url_conteudo: $("#comUrl").val()?.trim() || "",
      file: $("#comArquivo")[0]?.files?.[0] || null,
      documentos_anexos: this.modalState.anexos,
    };
  }

  parseList(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
}
