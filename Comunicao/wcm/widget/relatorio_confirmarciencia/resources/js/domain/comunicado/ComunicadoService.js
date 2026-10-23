class ComunicadoService {
  static lastListarInfo = "";
  static cacheFichas = {};

  static async listar(filters = {}, opcoes = {}) {
    const pageSize = Math.max(1, parseInt(opcoes.pageSize, 10) || ComunicadoConstants.PAGE_SIZE || 10);
    const page = Math.max(1, parseInt(opcoes.page, 10) || 1);
    var ciencias = opcoes.ciencias;
    var processos = opcoes.processos;
    if (!ciencias || !processos) {
      const par = await Promise.all([
        ciencias ? Promise.resolve(ciencias) : ComunicadoService.listarCienciasSafe(),
        processos ? Promise.resolve(processos) : ComunicadoService.listarProcessosGestor(),
      ]);
      ciencias = par[0];
      processos = par[1];
    }
    const agrupado = opcoes.agrupado || ComunicadoService.agruparCiencias(ciencias);
    processos = ComunicadoService.ordenarProcessosRecentes(processos);
    if (processos[0]) {
      console.log("ComunicadoService.workflowProcess[0]", processos[0]);
    }

    var origem = "ciencias";
    var mestres = [];
    var total = 0;
    var fichas = [];

    if (processos.length) {
      origem = "processos";
      const indice = ComunicadoService.indiceProcessosVisiveis(processos, filters, agrupado);
      total = indice.length;
      const inicio = (page - 1) * pageSize;
      const fatia = indice.slice(inicio, inicio + pageSize);
      fichas = fatia.length ? await ComunicadoService.buscarFichasGestorSafe(fatia) : [];
      mestres = ComunicadoService.montarMestresDeProcessos(fatia, fichas, agrupado);
    } else {
      mestres = ComunicadoService.unirMestres(
        ComunicadoService.montarMestresDeCiencias(agrupado),
        ComunicadoService.montarMestresDeCiencias(ComunicadoService.agruparOrfaosPorAssunto(ciencias))
      );
      mestres = ComunicadoService.aplicarMarcacoes(mestres);
      mestres = mestres.filter((row) => ComunicadoService.campo(row, "EXCLUIDO") !== "S");
      mestres = ComunicadoService.filtrarMestres(mestres, filters);
      mestres = ComunicadoService.ordenarMestresRecentes(mestres);
      total = mestres.length;
      mestres = mestres.slice((page - 1) * pageSize, page * pageSize);
    }

    if (processos.length) {
      mestres = ComunicadoService.aplicarMarcacoes(mestres);
      mestres = mestres.filter((row) => ComunicadoService.campo(row, "EXCLUIDO") !== "S");
    }

    try {
      await ComunicadoService.preencherNomesCriadores(mestres);
    } catch (eNome) {
      console.error("ComunicadoService.preencherNomesCriadores", eNome);
    }
    if (fichas[0]) {
      console.log("ComunicadoService.ficha[0]", {
        keys: Object.keys(fichas[0]),
        titulo: fichas[0].titulo || fichas[0].TITULO,
        data_fim: fichas[0].data_fim || fichas[0].DATA_FIM,
        criado_por: fichas[0].criado_por || fichas[0].CRIADO_POR,
        criado_por_nome: fichas[0].criado_por_nome || fichas[0].CRIADO_POR_NOME,
      });
    }
    if (mestres[0]) {
      console.log("ComunicadoService.mestre[0]", {
        DATA_FIM: mestres[0].DATA_FIM,
        SEM_DATA_EXPIRACAO: mestres[0].SEM_DATA_EXPIRACAO,
        CRIADO_POR: mestres[0].CRIADO_POR,
        CRIADO_POR_NOME: mestres[0].CRIADO_POR_NOME,
      });
    }
    const filtrados = processos.length ? ComunicadoService.filtrarMestres(mestres, filters) : mestres;
    ComunicadoService.lastListarInfo =
      "orig=" +
      origem +
      " page=" +
      page +
      "/" +
      pageSize +
      " ciencias=" +
      ciencias.length +
      " processos=" +
      processos.length +
      " fichas=" +
      fichas.length +
      " total=" +
      total +
      " pagina=" +
      filtrados.length;
    console.log("ComunicadoService.listar", ComunicadoService.lastListarInfo);
    return {
      itens: filtrados,
      total: total,
      page: page,
      pageSize: pageSize,
      processos: processos,
      ciencias: ciencias,
      agrupado: agrupado,
    };
  }

  static ordenarProcessosRecentes(processos) {
    return (processos || []).slice().sort(function (a, b) {
      const na = parseInt(ComunicadoService.numeroDoProcesso(a), 10) || 0;
      const nb = parseInt(ComunicadoService.numeroDoProcesso(b), 10) || 0;
      if (nb !== na) return nb - na;
      const da = ComunicadoService.isoDate(
        ComunicadoService.campo(a, "startDateProcess") || ComunicadoService.campo(a, "startDate")
      );
      const db = ComunicadoService.isoDate(
        ComunicadoService.campo(b, "startDateProcess") || ComunicadoService.campo(b, "startDate")
      );
      return String(db || "").localeCompare(String(da || ""));
    });
  }

  static ordenarMestresRecentes(mestres) {
    return (mestres || []).slice().sort(function (a, b) {
      const na = parseInt(a && a.NUMERO_PROCESSO, 10) || 0;
      const nb = parseInt(b && b.NUMERO_PROCESSO, 10) || 0;
      if (nb !== na) return nb - na;
      return String(b && b.DATA_CRIACAO ? b.DATA_CRIACAO : "").localeCompare(
        String(a && a.DATA_CRIACAO ? a.DATA_CRIACAO : "")
      );
    });
  }

  static tituloDoProcesso(proc, agrupado) {
    const numero = ComunicadoService.numeroDoProcesso(proc);
    const grupo = (agrupado && agrupado[numero]) || { itens: [] };
    const amostra = grupo.itens[0] || {};
    return String(
      ComunicadoService.campo(proc, "cardDescription") ||
        ComunicadoService.campo(proc, "processDescription") ||
        ComunicadoService.campo(proc, "documentDescription") ||
        ComunicadoService.campo(amostra, "ASSUNTO") ||
        ""
    );
  }

  static dataDoProcesso(proc, agrupado) {
    const numero = ComunicadoService.numeroDoProcesso(proc);
    const grupo = (agrupado && agrupado[numero]) || { itens: [] };
    const amostra = grupo.itens[0] || {};
    return ComunicadoService.isoDate(
      ComunicadoService.campo(proc, "startDateProcess") ||
        ComunicadoService.campo(proc, "startDate") ||
        ComunicadoService.campo(amostra, "DATA_SOLICITACAO")
    );
  }

  static indiceProcessosVisiveis(processos, filters, agrupado) {
    const mapa = ComunicadoService.lerMarcacoes();
    const titulo = String((filters && filters.titulo) || "").toLowerCase();
    const dataInicial = ComunicadoService.isoDate(filters && filters.data_inicial);
    const dataFinal = ComunicadoService.isoDate(filters && filters.data_final);
    const criadoPor = String((filters && filters.criado_por) || "");
    const aceite = String((filters && filters.aceite) || "");
    return (processos || []).filter(function (proc) {
      const numero = ComunicadoService.numeroDoProcesso(proc);
      const marca = mapa[numero] || {};
      if (marca.excluido === "S") return false;
      if (criadoPor) {
        const solicitante = String(ComunicadoService.idSolicitante(proc) || marca.criado_por || "");
        if (solicitante && solicitante !== criadoPor) return false;
      }
      if (dataInicial || dataFinal) {
        const criacao = ComunicadoService.dataDoProcesso(proc, agrupado) || ComunicadoService.isoDate(marca.data_criacao);
        if (dataInicial && (!criacao || criacao < dataInicial)) return false;
        if (dataFinal && (!criacao || criacao > dataFinal)) return false;
      }
      if (titulo) {
        const texto = (
          ComunicadoService.tituloDoProcesso(proc, agrupado) +
          " " +
          (marca.titulo || "") +
          " " +
          numero
        ).toLowerCase();
        if (texto.indexOf(titulo) === -1) return false;
      }
      if (aceite === "com" || aceite === "sem") {
        const grupo = (agrupado && agrupado[numero]) || { aceites: 0 };
        const qtd = grupo.aceites || 0;
        if (aceite === "com" && !(qtd > 0)) return false;
        if (aceite === "sem" && qtd > 0) return false;
      }
      return true;
    });
  }

  static async listarCienciasSafe() {
    try {
      const data = await FluigUtils.genericRestDatasetCallV2({
        dataset: ComunicadoConstants.DATASETS.CIENCIAS_LISTAR,
        constraints: {},
      });
      if (data?.[0]?.ERRO) {
        throw data[0].ERRO;
      }
      if (data && data.length) {
        return data;
      }
    } catch (e) {
      console.error("ComunicadoService.listarCiencias REST", e);
      ComunicadoService.lastListarInfo = String(e && e.message ? e.message : e);
    }
    try {
      const viaFactory = ComunicadoService.viaDatasetFactory(ComunicadoConstants.DATASETS.CIENCIAS_LISTAR, null);
      if (viaFactory && viaFactory.length && !viaFactory[0].ERRO) {
        return viaFactory;
      }
    } catch (e) {
      console.error("ComunicadoService.listarCiencias Factory", e);
    }
    return [];
  }

  static async listarProcessosGestor() {
    const codigo = ComunicadoConstants.PROCESS_GESTOR;
    const constraints = { processId: { initialValue: codigo, finalValue: codigo } };
    var lista = [];

    try {
      const rest = await FluigUtils.genericRestDatasetCallV2({
        dataset: "workflowProcess",
        constraints,
      });
      lista = ComunicadoService.unirProcessos(lista, ComunicadoService.filtrarProcessosGestor(rest));
    } catch (e) {
      console.error("ComunicadoService.listarProcessosGestor REST", e);
    }

    const factory = ComunicadoService.viaDatasetFactory("workflowProcess", constraints);
    lista = ComunicadoService.unirProcessos(lista, ComunicadoService.filtrarProcessosGestor(factory));

    if (lista.length <= 4) {
      const factoryLimite = ComunicadoService.viaDatasetFactory("workflowProcess", {
        processId: { initialValue: codigo, finalValue: codigo },
        sqlLimit: { initialValue: "200", finalValue: "200" },
      });
      lista = ComunicadoService.unirProcessos(lista, ComunicadoService.filtrarProcessosGestor(factoryLimite));
    }

    return lista;
  }

  static filtrarProcessosGestor(rows) {
    const codigo = String(ComunicadoConstants.PROCESS_GESTOR || "").toLowerCase();
    return (rows || []).filter((row) => {
      if (!row || row.ERRO) return false;
      const id = String(ComunicadoService.campo(row, "processId") || "").toLowerCase();
      return id === codigo;
    });
  }

  static unirProcessos(base, extra) {
    const mapa = {};
    const ordem = [];
    (base || [])
      .concat(extra || [])
      .forEach((row) => {
        const numero = ComunicadoService.numeroDoProcesso(row);
        if (!numero || mapa[numero]) return;
        mapa[numero] = row;
        ordem.push(numero);
      });
    return ordem.map((k) => mapa[k]);
  }

  static async buscarFichasGestorSafe(processos) {
    const ids = [];
    (processos || []).forEach((proc) => {
      const id = String(
        ComunicadoService.campo(proc, "cardDocumentId") ||
          ComunicadoService.campo(proc, "documentId") ||
          ComunicadoService.campo(proc, "cardId") ||
          ""
      );
      if (id && ids.indexOf(id) === -1) {
        ids.push(id);
      }
    });

    const porDoc = [];
    const idsBuscar = ids.filter(function (id) {
      const cached = ComunicadoService.cacheFichas[id];
      return !cached || ComunicadoService.fichaIncompleta(cached);
    });
    ids.forEach(function (id) {
      const cached = ComunicadoService.cacheFichas[id];
      if (cached) porDoc.push(cached);
    });
    for (var i = 0; i < idsBuscar.length; i++) {
      const tentativasDoc = [
        { documentid: { initialValue: idsBuscar[i], finalValue: idsBuscar[i] } },
        { "documentPK.documentId": { initialValue: idsBuscar[i], finalValue: idsBuscar[i] } },
        { "metadata#id": { initialValue: idsBuscar[i], finalValue: idsBuscar[i] } },
      ];
      for (var t = 0; t < tentativasDoc.length; t++) {
        try {
          const rows = await ComunicadoService.consultarDataset(ComunicadoConstants.DATASET_FICHA_GESTOR, tentativasDoc[t]);
          var achou = false;
          (rows || []).forEach((row) => {
            if (!row || row.ERRO) return;
            porDoc.push(row);
            achou = true;
          });
          if (achou) break;
        } catch (eDoc) {
          console.error("ComunicadoService.buscarFichasGestor documentid", idsBuscar[i], eDoc);
        }
      }
    }

    const porId = {};
    porDoc.forEach((row) => {
      const doc = String(ComunicadoService.campo(row, "documentid") || ComunicadoService.campo(row, "DOCUMENTID") || "");
      if (doc) porId[doc] = row;
    });

    for (var p = 0; p < (processos || []).length; p++) {
      const proc = processos[p];
      const id = String(
        ComunicadoService.campo(proc, "cardDocumentId") ||
          ComunicadoService.campo(proc, "documentId") ||
          ComunicadoService.campo(proc, "cardId") ||
          ""
      );
      if (!id) continue;
      var ficha = ComunicadoService.normalizarFicha(porId[id], proc);
      if (ComunicadoService.fichaIncompleta(ficha)) {
        const lida = await ComunicadoService.lerFicha(
          id,
          ComunicadoService.campo(proc, "cardIndexDocumentId"),
          ComunicadoService.numeroDoProcesso(proc)
        );
        ficha = ComunicadoService.normalizarFicha(ComunicadoService.mesclarFicha(ficha, lida), proc);
      }
      if (ficha && Object.keys(ficha).length) {
        porId[id] = ficha;
        ComunicadoService.cacheFichas[id] = ficha;
      }
    }
    return ComunicadoService.deduplicarFichas(ComunicadoService.somenteAtivos(Object.keys(porId).map((k) => porId[k])));
  }

  static fichaIncompleta(ficha) {
    if (!ficha || !Object.keys(ficha).length) return true;
    const criacao =
      ComunicadoService.campo(ficha, "data_criacao") || ComunicadoService.campo(ficha, "DATA_CRIACAO");
    const fim = ComunicadoService.campo(ficha, "data_fim") || ComunicadoService.campo(ficha, "DATA_FIM");
    const sem = ComunicadoService.flagSN(
      ComunicadoService.campo(ficha, "sem_data_expiracao") || ComunicadoService.campo(ficha, "SEM_DATA_EXPIRACAO")
    );
    const nome =
      ComunicadoService.campo(ficha, "criado_por_nome") || ComunicadoService.campo(ficha, "CRIADO_POR_NOME");
    const matricula = ComunicadoService.campo(ficha, "criado_por") || ComunicadoService.campo(ficha, "CRIADO_POR");
    const titulo = ComunicadoService.campo(ficha, "titulo") || ComunicadoService.campo(ficha, "TITULO");
    if (!criacao) return true;
    if (sem !== "S" && !fim) return true;
    if (!ComunicadoService.ehNomePessoa(nome, matricula)) return true;
    if (!titulo) return true;
    return false;
  }

  static mesclarFicha(base, extra) {
    const saida = Object.assign({}, base || {});
    Object.keys(extra || {}).forEach(function (key) {
      const valor = extra[key];
      if (valor == null || valor === "") return;
      saida[key] = valor;
    });
    return saida;
  }

  static normalizarFicha(ficha, proc) {
    const row = Object.assign({}, ficha || {});
    if (!row || !Object.keys(row).length) {
      return row;
    }
    const numero =
      ComunicadoService.campo(row, "numero_processo") ||
      ComunicadoService.campo(row, "NUMERO_PROCESSO") ||
      ComunicadoService.numeroDoProcesso(proc);
    const cardId =
      ComunicadoService.campo(row, "documentid") ||
      ComunicadoService.campo(row, "DOCUMENTID") ||
      ComunicadoService.campo(proc, "cardDocumentId");
    row.NUMERO_PROCESSO = numero;
    row.numero_processo = numero;
    row.DOCUMENTID = cardId;
    row.documentid = cardId;
    row.TITULO = ComunicadoService.campo(row, "titulo") || ComunicadoService.campo(row, "TITULO");
    row.titulo = row.TITULO;
    row.DATA_CRIACAO =
      ComunicadoService.campo(row, "data_criacao") || ComunicadoService.campo(row, "DATA_CRIACAO");
    row.data_criacao = row.DATA_CRIACAO;
    row.DATA_FIM = ComunicadoService.campo(row, "data_fim") || ComunicadoService.campo(row, "DATA_FIM");
    row.data_fim = row.DATA_FIM;
    row.SEM_DATA_EXPIRACAO = ComunicadoService.flagSN(
      ComunicadoService.campo(row, "sem_data_expiracao") || ComunicadoService.campo(row, "SEM_DATA_EXPIRACAO")
    );
    row.sem_data_expiracao = row.SEM_DATA_EXPIRACAO;
    row.CRIADO_POR = ComunicadoService.campo(row, "criado_por") || ComunicadoService.campo(row, "CRIADO_POR");
    row.criado_por = row.CRIADO_POR;
    row.CRIADO_POR_NOME =
      ComunicadoService.campo(row, "criado_por_nome") || ComunicadoService.campo(row, "CRIADO_POR_NOME");
    row.criado_por_nome = row.CRIADO_POR_NOME;
    row.STATUS = ComunicadoService.campo(row, "status") || ComunicadoService.campo(row, "STATUS");
    row.status = row.STATUS;
    return row;
  }

  static flagSN(value) {
    const texto = String(value == null ? "" : value).trim().toLowerCase();
    if (texto === "s" || texto === "true" || texto === "1" || texto === "on" || texto === "sim") return "S";
    if (texto === "n" || texto === "false" || texto === "0" || texto === "off" || texto === "nao" || texto === "não") {
      return "N";
    }
    return "";
  }

  static ehNomePessoa(nome, matricula) {
    const texto = String(nome || "").trim();
    const codigo = String(matricula || "").trim();
    if (!texto) return false;
    if (codigo && texto === codigo) return false;
    if (/^\d+$/.test(texto)) return false;
    return true;
  }

  static async consultarDataset(name, constraints) {
    var rest = [];
    try {
      const data = await FluigUtils.genericRestDatasetCallV2({
        dataset: name,
        constraints: constraints || {},
      });
      if (data?.[0]?.ERRO) {
        throw data[0].ERRO;
      }
      rest = data || [];
    } catch (e) {
      console.error("ComunicadoService.consultarDataset REST", name, e);
    }
    if (rest.length) {
      return rest;
    }
    const viaFactory = ComunicadoService.viaDatasetFactory(name, constraints);
    return viaFactory || [];
  }

  static viaDatasetFactory(name, constraintsMap) {
    const Factory = window.DatasetFactory || (window.parent && window.parent.DatasetFactory) || (window.top && window.top.DatasetFactory);
    const Type = window.ConstraintType || (window.parent && window.parent.ConstraintType) || (window.top && window.top.ConstraintType);
    if (!Factory || typeof Factory.getDataset !== "function" || !Type) {
      return null;
    }
    try {
      const constraints = [];
      if (constraintsMap) {
        Object.keys(constraintsMap).forEach((key) => {
          const c = constraintsMap[key];
          const initial = c && typeof c === "object" && c.initialValue != null ? c.initialValue : c;
          const final = c && typeof c === "object" && c.finalValue != null ? c.finalValue : initial;
          constraints.push(Factory.createConstraint(key, initial, final, Type.MUST));
        });
      }
      const ds = Factory.getDataset(name, null, constraints.length ? constraints : null, null);
      if (!ds || !ds.values) {
        return [];
      }
      if (ds.values[0] && ds.values[0].ERRO) {
        throw ds.values[0].ERRO;
      }
      return ds.values;
    } catch (e) {
      console.error("ComunicadoService.viaDatasetFactory", name, e);
      return null;
    }
  }

  static montarMestresDeProcessos(processos, fichas, agrupado) {
    const porDocumento = {};
    const porProcesso = {};
    (fichas || []).forEach((row) => {
      const doc = String(ComunicadoService.campo(row, "documentid") || ComunicadoService.campo(row, "DOCUMENTID") || "");
      const num = String(ComunicadoService.campo(row, "NUMERO_PROCESSO") || "");
      if (doc) porDocumento[doc] = row;
      if (num) porProcesso[num] = row;
    });

    return processos.map((proc) => {
      const numero = ComunicadoService.numeroDoProcesso(proc);
      const cardId = String(
        ComunicadoService.campo(proc, "cardDocumentId") ||
          ComunicadoService.campo(proc, "documentId") ||
          ComunicadoService.campo(proc, "cardId") ||
          ""
      );
      const ficha = porDocumento[cardId] || porProcesso[numero] || {};
      const grupo = agrupado[numero] || { itens: [] };
      const amostra = grupo.itens[0] || {};
      return ComunicadoService.enriquecerMestre(
        Object.assign({}, ficha, {
          NUMERO_PROCESSO: numero || ComunicadoService.campo(ficha, "NUMERO_PROCESSO"),
          DOCUMENTID: cardId || ComunicadoService.campo(ficha, "documentid"),
          CARD_INDEX_DOCUMENT_ID:
            ComunicadoService.campo(proc, "cardIndexDocumentId") || ComunicadoService.campo(ficha, "cardIndexDocumentId"),
          TITULO:
            ComunicadoService.campo(ficha, "TITULO") ||
            ComunicadoService.campo(ficha, "titulo") ||
            ComunicadoService.campo(amostra, "ASSUNTO") ||
            (numero ? "Comunicado " + numero : ""),
          DATA_CRIACAO:
            ComunicadoService.campo(ficha, "DATA_CRIACAO") ||
            ComunicadoService.campo(ficha, "data_criacao") ||
            ComunicadoService.campo(proc, "startDateProcess") ||
            ComunicadoService.campo(proc, "startDate") ||
            ComunicadoService.campo(amostra, "DATA_SOLICITACAO"),
          CRIADO_POR:
            ComunicadoService.campo(ficha, "CRIADO_POR") ||
            ComunicadoService.campo(ficha, "criado_por") ||
            ComunicadoService.idSolicitante(proc),
          CRIADO_POR_NOME:
            ComunicadoService.campo(ficha, "CRIADO_POR_NOME") ||
            ComunicadoService.campo(ficha, "criado_por_nome") ||
            ComunicadoService.nomeSolicitante(proc),
          DATA_FIM:
            ComunicadoService.campo(ficha, "DATA_FIM") ||
            ComunicadoService.campo(ficha, "data_fim") ||
            ComunicadoService.campo(ficha, "dataFim"),
          SEM_DATA_EXPIRACAO: ComunicadoService.flagSN(
            ComunicadoService.campo(ficha, "SEM_DATA_EXPIRACAO") || ComunicadoService.campo(ficha, "sem_data_expiracao")
          ),
          STATUS: ComunicadoService.statusDoProcesso(proc, ficha, grupo),
          EXCLUIDO: ComunicadoService.campo(ficha, "EXCLUIDO") || ComunicadoService.campo(ficha, "excluido"),
          CANCELADO: ComunicadoService.campo(ficha, "CANCELADO") || ComunicadoService.campo(ficha, "cancelado"),
        }),
        agrupado
      );
    });
  }

  static idSolicitante(proc) {
    return (
      ComunicadoService.campo(proc, "requesterId") ||
      ComunicadoService.campo(proc, "requester") ||
      ComunicadoService.campo(proc, "clientId") ||
      ComunicadoService.campo(proc, "startUser") ||
      ComunicadoService.campo(proc, "userId") ||
      ComunicadoService.campo(proc, "colleagueId") ||
      ""
    );
  }

  static nomeSolicitante(proc) {
    return (
      ComunicadoService.campo(proc, "requesterName") ||
      ComunicadoService.campo(proc, "colleagueName") ||
      ComunicadoService.campo(proc, "fullName") ||
      ComunicadoService.campo(proc, "startUserName") ||
      ""
    );
  }

  static numeroDoProcesso(proc) {
    return String(
      ComunicadoService.campo(proc, "workflowProcessPK.processInstanceId") ||
        ComunicadoService.campo(proc, "processInstanceId") ||
        ComunicadoService.campo(proc, "processinstanceid") ||
        ComunicadoService.campo(proc, "NUMERO_PROCESSO") ||
        ""
    );
  }

  static statusDoProcesso(proc, ficha, grupo) {
    const canceladoFicha =
      ComunicadoService.campo(ficha, "CANCELADO") === "S" ||
      ComunicadoService.campo(ficha, "cancelado") === "S" ||
      ComunicadoService.campo(ficha, "EXCLUIDO") === "S" ||
      ComunicadoService.campo(ficha, "excluido") === "S";
    const wpStatus = String(ComunicadoService.campo(proc, "status") || "");
    if (canceladoFicha || wpStatus === "1") {
      return "CANCELADO";
    }
    const fichaStatus = String(
      ComunicadoService.campo(ficha, "STATUS") || ComunicadoService.campo(ficha, "status") || ""
    ).toUpperCase();
    if (["AGENDADO", "ATIVO", "EXPIRADO", "CANCELADO"].indexOf(fichaStatus) !== -1) {
      return ComunicadoService.statusEfetivo(
        Object.assign({}, ficha, {
          STATUS: fichaStatus,
          CANCELADO: ComunicadoService.campo(ficha, "CANCELADO") || ComunicadoService.campo(ficha, "cancelado"),
          DATA_FIM: ComunicadoService.campo(ficha, "DATA_FIM") || ComunicadoService.campo(ficha, "data_fim"),
          SEM_DATA_EXPIRACAO: ComunicadoService.campo(ficha, "SEM_DATA_EXPIRACAO") || ComunicadoService.campo(ficha, "sem_data_expiracao"),
        })
      );
    }
    if (grupo && grupo.itens && grupo.itens.length) {
      return "ATIVO";
    }
    return "AGENDADO";
  }

  static montarMestresDeCiencias(agrupado) {
    return Object.keys(agrupado || {}).map((pai) => {
      const grupo = agrupado[pai];
      const amostra = grupo.itens[0] || {};
      const numero = String(pai).indexOf("assunto:") === 0 ? "" : pai;
      return ComunicadoService.enriquecerMestre(
        {
          NUMERO_PROCESSO: numero,
          TITULO: ComunicadoService.campo(amostra, "ASSUNTO") || "Comunicado " + (numero || ""),
          DATA_CRIACAO: ComunicadoService.campo(amostra, "DATA_SOLICITACAO"),
          DATA_FIM: "",
          SEM_DATA_EXPIRACAO: numero ? "" : "S",
          STATUS: "ATIVO",
          EXCLUIDO: "N",
        },
        agrupado,
        grupo
      );
    });
  }

  static agruparOrfaosPorAssunto(ciencias) {
    const mapa = {};
    (ciencias || []).forEach((el) => {
      if (ComunicadoService.campo(el, "NUMERO_PROCESSO_PAI")) return;
      const assunto = String(ComunicadoService.campo(el, "ASSUNTO") || "").trim() || "(Sem título)";
      const chave = "assunto:" + assunto;
      if (!mapa[chave]) {
        mapa[chave] = { aceites: 0, pendentes: 0, itens: [] };
      }
      mapa[chave].itens.push(el);
      if (ComunicadoService.aceitou(el)) {
        mapa[chave].aceites++;
      } else {
        mapa[chave].pendentes++;
      }
    });
    return mapa;
  }

  static unirMestres(base, extra) {
    const mapa = {};
    const ordem = [];
    const colocar = (row) => {
      if (!row) return;
      const numero = String(row.NUMERO_PROCESSO || "");
      const titulo = String(row.TITULO || "");
      const chave = numero || "t:" + titulo;
      if (!mapa[chave]) {
        mapa[chave] = row;
        ordem.push(chave);
        return;
      }
      const atual = mapa[chave];
      mapa[chave] = Object.assign({}, row, atual, {
        TITULO:
          atual.TITULO && String(atual.TITULO).indexOf("Comunicado ") !== 0
            ? atual.TITULO
            : row.TITULO || atual.TITULO,
        DATA_CRIACAO: atual.DATA_CRIACAO || row.DATA_CRIACAO,
        DATA_FIM: atual.DATA_FIM || row.DATA_FIM,
        CRIADO_POR_NOME: atual.CRIADO_POR_NOME || row.CRIADO_POR_NOME,
        CRIADO_POR: atual.CRIADO_POR || row.CRIADO_POR,
        SEM_DATA_EXPIRACAO: atual.DATA_FIM ? atual.SEM_DATA_EXPIRACAO : atual.SEM_DATA_EXPIRACAO || row.SEM_DATA_EXPIRACAO,
        STATUS: atual.STATUS || row.STATUS,
        QTD_ACEITES: Math.max(atual.QTD_ACEITES || 0, row.QTD_ACEITES || 0),
        QTD_PENDENTES: Math.max(atual.QTD_PENDENTES || 0, row.QTD_PENDENTES || 0),
        CIENCIAS: (atual.CIENCIAS && atual.CIENCIAS.length ? atual.CIENCIAS : row.CIENCIAS) || [],
        NUMERO_PROCESSO: atual.NUMERO_PROCESSO || row.NUMERO_PROCESSO,
      });
    };
    (base || []).forEach(colocar);
    (extra || []).forEach(colocar);
    return ordem.map((k) => mapa[k]);
  }

  static async preencherNomesCriadores(mestres) {
    const pendentes = [];
    (mestres || []).forEach((row) => {
      if (ComunicadoService.ehNomePessoa(row.CRIADO_POR_NOME, row.CRIADO_POR)) return;
      const matricula = String(row.CRIADO_POR || "").trim();
      if (matricula && pendentes.indexOf(matricula) === -1) {
        pendentes.push(matricula);
      }
    });
    const nomes = {};
    for (var i = 0; i < pendentes.length; i++) {
      nomes[pendentes[i]] = await ComunicadoService.buscarNomeColleague(pendentes[i]);
    }
    (mestres || []).forEach((row) => {
      if (!ComunicadoService.ehNomePessoa(row.CRIADO_POR_NOME, row.CRIADO_POR) && row.CRIADO_POR && nomes[row.CRIADO_POR]) {
        row.CRIADO_POR_NOME = nomes[row.CRIADO_POR];
      }
    });
  }

  static async buscarNomeColleague(matricula) {
    const codigo = String(matricula || "").trim();
    if (!codigo) return "";
    const tentativas = [
      { "colleaguePK.colleagueId": { initialValue: codigo, finalValue: codigo } },
      { colleagueId: { initialValue: codigo, finalValue: codigo } },
      { login: { initialValue: codigo, finalValue: codigo } },
    ];
    for (var i = 0; i < tentativas.length; i++) {
      try {
        const data = await ComunicadoService.consultarDataset("colleague", tentativas[i]);
        const encontrado =
          ComunicadoService.campo(data && data[0], "colleagueName") ||
          ComunicadoService.campo(data && data[0], "fullName") ||
          ComunicadoService.campo(data && data[0], "NOME");
        if (encontrado) return encontrado;
      } catch (e) {
        console.error("ComunicadoService.buscarNomeColleague", tentativas[i], e);
      }
    }
    try {
      const viaV1 = await FluigUtils.genericRestDatasetCall({
        dataset: "colleague",
        constraints: { "colleaguePK.colleagueId": codigo },
      });
      const nomeV1 =
        ComunicadoService.campo(viaV1 && viaV1[0], "colleagueName") ||
        ComunicadoService.campo(viaV1 && viaV1[0], "fullName");
      if (nomeV1) return nomeV1;
    } catch (eV1) {
      console.error("ComunicadoService.buscarNomeColleague v1", eV1);
    }
    return "";
  }

  static somenteAtivos(rows) {
    const filtrados = (rows || []).filter((row) => {
      const ativo =
        ComunicadoService.campo(row, "metadata#active") ||
        ComunicadoService.campo(row, "md_active") ||
        ComunicadoService.campo(row, "METADATA#ACTIVE");
      if (ativo === "" || ativo == null) return true;
      const texto = String(ativo).toLowerCase();
      return texto === "true" || texto === "1" || ativo === true;
    });
    return filtrados.length ? filtrados : rows || [];
  }

  static deduplicarFichas(rows) {
    const mapa = {};
    (rows || []).forEach((row) => {
      const id = String(
        ComunicadoService.campo(row, "documentid") ||
          ComunicadoService.campo(row, "DOCUMENTID") ||
          ComunicadoService.campo(row, "NUMERO_PROCESSO") ||
          ""
      );
      const chave = id || String(ComunicadoService.campo(row, "TITULO") || Math.random());
      const versao = parseInt(ComunicadoService.campo(row, "version") || ComunicadoService.campo(row, "VERSION") || "0", 10) || 0;
      if (!mapa[chave] || versao >= mapa[chave]._versao) {
        mapa[chave] = Object.assign({}, row, { _versao: versao });
      }
    });
    return Object.keys(mapa).map((k) => mapa[k]);
  }

  static async listarCiencias(constraints = null) {
    const data = await FluigUtils.genericRestDatasetCallV2({
      dataset: ComunicadoConstants.DATASETS.CIENCIAS_LISTAR,
      constraints,
    });
    if (data?.[0]?.ERRO) {
      throw data[0].ERRO;
    }
    return data || [];
  }

  static valorUtil(value) {
    if (value == null || value === "null" || value === "undefined" || value === "") {
      return "";
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return value;
    }
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? "" : value;
    }
    if (typeof value === "object") {
      if (value.time != null) return value.time;
      if (value.millis != null) return value.millis;
      if (value.colleagueId != null && String(value.colleagueId) !== "") return value.colleagueId;
      if (value.userCode != null && String(value.userCode) !== "") return value.userCode;
      if (value.login != null && String(value.login) !== "") return value.login;
      const dataObj = ComunicadoService.dataDeObjeto(value);
      if (dataObj) return dataObj;
      if (value.date != null) return ComunicadoService.valorUtil(value.date);
      if (value.value != null) return ComunicadoService.valorUtil(value.value);
    }
    return value;
  }

  static dataDeObjeto(value) {
    if (!value || typeof value !== "object") return null;
    const year = value.year != null ? Number(value.year) : value.yearValue != null ? Number(value.yearValue) : NaN;
    const day = value.day != null ? Number(value.day) : value.dayOfMonth != null ? Number(value.dayOfMonth) : NaN;
    var month = value.month != null ? Number(value.month) : value.monthValue != null ? Number(value.monthValue) : NaN;
    if (isNaN(year) || isNaN(day) || isNaN(month)) return null;
    if (month >= 0 && month <= 11 && value.dayOfMonth != null) {
      month = month + 1;
    }
    if (month < 1 || month > 12) return null;
    const dt = new Date(year, month - 1, day);
    return isNaN(dt.getTime()) ? null : dt;
  }

  static prop(obj, name) {
    if (!obj || typeof obj !== "object") {
      return null;
    }
    if (Object.prototype.hasOwnProperty.call(obj, name) && obj[name] != null) {
      return obj[name];
    }
    const lower = String(name).toLowerCase();
    const keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].toLowerCase() === lower) {
        return obj[keys[i]];
      }
    }
    return null;
  }

  static campo(row, name) {
    if (!row) return "";
    const direto = ComunicadoService.valorUtil(row[name]);
    if (direto !== "") return direto;
    const upper = name.toUpperCase();
    const lower = name.toLowerCase();
    const viaUpper = ComunicadoService.valorUtil(row[upper]);
    if (viaUpper !== "") return viaUpper;
    const viaLower = ComunicadoService.valorUtil(row[lower]);
    if (viaLower !== "") return viaLower;

    if (name.indexOf(".") >= 0) {
      const partes = name.split(".");
      var atual = row;
      for (var p = 0; p < partes.length; p++) {
        atual = ComunicadoService.prop(atual, partes[p]);
        if (atual == null) break;
      }
      const aninhado = ComunicadoService.valorUtil(atual);
      if (aninhado !== "") return aninhado;
    }

    const alvo = String(name).replace(/[._]/g, "").toLowerCase();
    const keys = Object.keys(row);
    for (var k = 0; k < keys.length; k++) {
      if (String(keys[k]).replace(/[._]/g, "").toLowerCase() === alvo) {
        const viaKey = ComunicadoService.valorUtil(row[keys[k]]);
        if (viaKey !== "") return viaKey;
      }
    }
    return "";
  }

  static isoDate(value) {
    const data = ComunicadoService.paraDate(value);
    if (!data) return "";
    const y = data.getFullYear();
    const m = ("0" + (data.getMonth() + 1)).slice(-2);
    const d = ("0" + data.getDate()).slice(-2);
    return y + "-" + m + "-" + d;
  }

  static paraDate(value) {
    if (value == null || value === "" || value === "null" || value === "undefined") return null;
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === "object") {
      const bruto = value.time != null ? value.time : value.date != null ? value.date : value.millis;
      if (bruto != null) return ComunicadoService.paraDate(bruto);
      return null;
    }
    const texto = String(value).trim();
    const msJson = texto.match(/\/Date\((-?\d+)\)\//);
    if (msJson) {
      const dt = new Date(Number(msJson[1]));
      return isNaN(dt.getTime()) ? null : dt;
    }
    const iso = texto.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      const dtIso = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
      return isNaN(dtIso.getTime()) ? null : dtIso;
    }
    const br = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (br) {
      const dtBr = new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
      return isNaN(dtBr.getTime()) ? null : dtBr;
    }
    const brTraco = texto.match(/(\d{2})-(\d{2})-(\d{4})/);
    if (brTraco) {
      const dtBrT = new Date(Number(brTraco[3]), Number(brTraco[2]) - 1, Number(brTraco[1]));
      return isNaN(dtBrT.getTime()) ? null : dtBrT;
    }
    if (/^\d{8}$/.test(texto)) {
      const dtYmd = new Date(Number(texto.slice(0, 4)), Number(texto.slice(4, 6)) - 1, Number(texto.slice(6, 8)));
      return isNaN(dtYmd.getTime()) ? null : dtYmd;
    }
    if (/^\d{13}$/.test(texto)) {
      const dtMs = new Date(Number(texto));
      return isNaN(dtMs.getTime()) ? null : dtMs;
    }
    if (/^\d{10}$/.test(texto)) {
      const dtS = new Date(Number(texto) * 1000);
      return isNaN(dtS.getTime()) ? null : dtS;
    }
    const parsed = new Date(texto);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  static formatarData(value) {
    const iso = ComunicadoService.isoDate(value);
    if (!iso) return "";
    return iso.slice(8, 10) + "/" + iso.slice(5, 7) + "/" + iso.slice(0, 4);
  }

  static aceitou(ciencia) {
    return ComunicadoService.situacaoCiencia(ciencia) === "aprovado";
  }

  static situacaoCiencia(ciencia) {
    const resultado = String(ComunicadoService.campo(ciencia, "RESULTADO") || "").toLowerCase();
    const estado = String(ComunicadoService.campo(ciencia, "NUM_SEQ_ESTADO") || "").replace(/\.0$/, "");
    const nom = String(ComunicadoService.campo(ciencia, "NOM_ESTADO") || "").toLowerCase();
    if (resultado === "reprovado" || estado === "20" || nom.indexOf("rejeit") >= 0) {
      return "reprovado";
    }
    if (resultado === "aprovado") {
      return "aprovado";
    }
    if (estado === "12" || (nom.indexOf("arquiv") >= 0 && nom.indexOf("rejeit") < 0)) {
      return "aprovado";
    }
    const data = ComunicadoService.campo(ciencia, "DATA_CIENCIA");
    if (data && String(data) !== "null") {
      return "aprovado";
    }
    return "pendente";
  }

  static paraDateHora(value) {
    if (value == null || value === "" || value === "null" || value === "undefined") return null;
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }
    const texto = String(value).trim();
    const isoHora = texto.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (isoHora) {
      const dtIso = new Date(
        Number(isoHora[1]),
        Number(isoHora[2]) - 1,
        Number(isoHora[3]),
        Number(isoHora[4]),
        Number(isoHora[5]),
        Number(isoHora[6] || 0)
      );
      return isNaN(dtIso.getTime()) ? null : dtIso;
    }
    const brHora = texto.match(/(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (brHora) {
      const dtBr = new Date(
        Number(brHora[3]),
        Number(brHora[2]) - 1,
        Number(brHora[1]),
        Number(brHora[4]),
        Number(brHora[5]),
        Number(brHora[6] || 0)
      );
      return isNaN(dtBr.getTime()) ? null : dtBr;
    }
    return ComunicadoService.paraDate(value);
  }

  static formatarHora(value) {
    const data = ComunicadoService.paraDateHora(value);
    if (!data) return "";
    const p = function (n) {
      return ("0" + n).slice(-2);
    };
    return p(data.getHours()) + ":" + p(data.getMinutes()) + ":" + p(data.getSeconds());
  }

  static dataHoraCiencia(ciencia) {
    const situacao = ComunicadoService.situacaoCiencia(ciencia);
    if (situacao === "pendente") {
      return { data: "", hora: "", millis: 0 };
    }
    const bruto = ComunicadoService.campo(ciencia, "DATA_CIENCIA");
    var dt = ComunicadoService.paraDateHora(bruto);
    if (!dt) {
      const diaHist =
        ComunicadoService.campo(ciencia, "MOVTO_DATE_FORMATED") ||
        ComunicadoService.campo(ciencia, "movto_date_formated");
      const horaHist =
        ComunicadoService.campo(ciencia, "MOVTO_TIME_FORMATED") ||
        ComunicadoService.campo(ciencia, "movto_time_formated");
      if (diaHist && horaHist) {
        dt = ComunicadoService.paraDateHora(String(diaHist) + " " + String(horaHist));
      }
    }
    if (!dt) {
      dt = ComunicadoService.paraDateHora(ComunicadoService.campo(ciencia, "MOVTO_DATE_TIME"));
    }
    if (!dt) {
      return { data: "", hora: "", millis: 0 };
    }
    return {
      data: ComunicadoService.formatarData(dt),
      hora: ComunicadoService.formatarHora(dt),
      millis: dt.getTime(),
    };
  }

  static montarAuditoria(ciencia) {
    const situacao = ComunicadoService.situacaoCiencia(ciencia);
    const quando = ComunicadoService.dataHoraCiencia(ciencia);
    const usuario =
      ComunicadoService.campo(ciencia, "FULL_NAME") ||
      ComunicadoService.campo(ciencia, "USUARIO_NOME") ||
      ComunicadoService.campo(ciencia, "usuario_nome") ||
      ComunicadoService.campo(ciencia, "USUARIO_MATRICULA") ||
      ComunicadoService.campo(ciencia, "usuario_matricula") ||
      "";
    return {
      USUARIO: usuario,
      DATA_ACEITE: situacao === "pendente" ? "" : quando.data,
      HORA_ACEITE: situacao === "pendente" ? "" : quando.hora,
      SITUACAO: situacao === "aprovado" ? "Aceite" : situacao === "reprovado" ? "Rejeitado" : "Pendente",
      SITUACAO_CODIGO: situacao,
      ORDENACAO: quando.millis || 0,
      NUMERO_PROCESSO: ComunicadoService.campo(ciencia, "NUMERO_PROCESSO"),
    };
  }

  static async listarAuditoria(record) {
    const numeroPai = String((record && record.NUMERO_PROCESSO) || "");
    var ciencias = [];
    try {
      ciencias = await ComunicadoService.listarCienciasSafe();
    } catch (e) {
      console.error("ComunicadoService.listarAuditoria", e);
    }
    const doPai = (ciencias || []).filter(function (el) {
      return String(ComunicadoService.campo(el, "NUMERO_PROCESSO_PAI") || "") === numeroPai;
    });
    const origem = doPai.length ? doPai : (record && record.CIENCIAS) || [];
    const itens = origem
      .map(function (el) {
        return ComunicadoService.montarAuditoria(el);
      })
      .sort(function (a, b) {
        if (a.SITUACAO_CODIGO === "pendente" && b.SITUACAO_CODIGO !== "pendente") return 1;
        if (a.SITUACAO_CODIGO !== "pendente" && b.SITUACAO_CODIGO === "pendente") return -1;
        if (b.ORDENACAO !== a.ORDENACAO) return b.ORDENACAO - a.ORDENACAO;
        return String(a.USUARIO || "").localeCompare(String(b.USUARIO || ""), "pt-BR");
      });
    const aceites = itens.filter(function (el) {
      return el.SITUACAO_CODIGO === "aprovado";
    }).length;
    const pendentes = itens.filter(function (el) {
      return el.SITUACAO_CODIGO === "pendente";
    }).length;
    return {
      resumo: {
        TITULO: (record && (record.TITULO || record.ASSUNTO)) || "",
        NUMERO_PROCESSO: numeroPai,
        QTD_ACEITES: aceites,
        QTD_PENDENTES: pendentes,
        QTD_TOTAL: itens.length,
      },
      itens: itens,
    };
  }

  static agruparCiencias(ciencias) {
    const mapa = {};
    (ciencias || []).forEach((el) => {
      const pai = String(ComunicadoService.campo(el, "NUMERO_PROCESSO_PAI") || "");
      if (!pai) return;
      if (!mapa[pai]) {
        mapa[pai] = { aceites: 0, pendentes: 0, itens: [] };
      }
      mapa[pai].itens.push(el);
      const situacao = ComunicadoService.situacaoCiencia(el);
      if (situacao === "aprovado") {
        mapa[pai].aceites++;
      } else if (situacao === "pendente") {
        mapa[pai].pendentes++;
      }
    });
    return mapa;
  }

  static statusEfetivo(mestre) {
    const status = String(ComunicadoService.campo(mestre, "STATUS") || "").toUpperCase();
    if (status === "CANCELADO") return "CANCELADO";
    if (ComunicadoService.campo(mestre, "CANCELADO") === "S") return "CANCELADO";
    const semExp = ComunicadoService.campo(mestre, "SEM_DATA_EXPIRACAO");
    const fim = ComunicadoService.isoDate(ComunicadoService.campo(mestre, "DATA_FIM"));
    const today = new Date().toISOString().slice(0, 10);
    if (semExp !== "S" && fim && fim < today) return "EXPIRADO";
    return status || "AGENDADO";
  }

  static linhaDaGrade(form, record, extras) {
    extras = extras || {};
    const wcm = (top && top.WCMAPI) || window.WCMAPI || {};
    const numero = String(extras.NUMERO_PROCESSO || (record && record.NUMERO_PROCESSO) || "");
    const today = new Date().toISOString().slice(0, 10);
    const inicio = ComunicadoService.isoDate((form && form.data_inicio) || (record && record.DATA_INICIO));
    var status = extras.STATUS || (record && record.STATUS) || "";
    if (extras.cancelado === "S") {
      status = ComunicadoConstants.STATUS.CANCELADO;
    } else if (extras.criar || !status) {
      status =
        (form && form.agendamento_futuro === "S") || (inicio && inicio > today)
          ? ComunicadoConstants.STATUS.AGENDADO
          : ComunicadoConstants.STATUS.ATIVO;
    }
    const row = Object.assign({}, record || {}, {
      NUMERO_PROCESSO: numero,
      TITULO: (form && form.titulo) || (record && record.TITULO) || "",
      DESCRICAO: (form && form.descricao) || (record && record.DESCRICAO) || "",
      DATA_INICIO: inicio || (record && record.DATA_INICIO) || "",
      DATA_FIM:
        form && form.sem_data_expiracao === "S"
          ? ""
          : (form && form.data_fim) || (record && record.DATA_FIM) || "",
      SEM_DATA_EXPIRACAO: form ? (form.sem_data_expiracao === "S" ? "S" : "N") : record && record.SEM_DATA_EXPIRACAO,
      EXIBIR_POPUP: form ? form.exibir_popup : record && record.EXIBIR_POPUP,
      AGENDAMENTO_FUTURO: form ? form.agendamento_futuro : record && record.AGENDAMENTO_FUTURO,
      TEXTO_BOTAO_ACAO: (form && form.texto_botao_acao) || (record && record.TEXTO_BOTAO_ACAO),
      PUBLICO_TIPO: (form && form.publico_tipo) || (record && record.PUBLICO_TIPO),
      PUBLICO_GRUPOS: (form && form.publico_grupos) || (record && record.PUBLICO_GRUPOS),
      PUBLICO_USUARIOS: (form && form.publico_usuarios) || (record && record.PUBLICO_USUARIOS),
      EXCECAO_GRUPOS: (form && form.excecao_grupos) || (record && record.EXCECAO_GRUPOS),
      EXCECAO_USUARIOS: (form && form.excecao_usuarios) || (record && record.EXCECAO_USUARIOS),
      TIPO_CONTEUDO: (form && form.tipo_conteudo) || (record && record.TIPO_CONTEUDO),
      URL_CONTEUDO: (form && form.url_conteudo) || (record && record.URL_CONTEUDO),
      DOCUMENTOS_ANEXOS: (form && form.documentos_anexos) || (record && record.DOCUMENTOS_ANEXOS),
      CRIADO_POR: (record && record.CRIADO_POR) || wcm.userCode || "",
      CRIADO_POR_NOME: (record && record.CRIADO_POR_NOME) || wcm.user || "",
      DATA_CRIACAO: (record && record.DATA_CRIACAO) || ComunicadoService.isoDate(ComunicadoService.agoraCard()) || today,
      STATUS: status,
      CANCELADO: extras.cancelado === "S" ? "S" : record && record.CANCELADO,
      EXCLUIDO: extras.excluido === "S" ? "S" : record && record.EXCLUIDO,
      QTD_ACEITES: record && record.QTD_ACEITES != null ? record.QTD_ACEITES : 0,
      QTD_PENDENTES: record && record.QTD_PENDENTES != null ? record.QTD_PENDENTES : 0,
      CIENCIAS: (record && record.CIENCIAS) || [],
    });
    return ComunicadoService.enriquecerMestre(row, null, {
      aceites: row.QTD_ACEITES || 0,
      pendentes: row.QTD_PENDENTES || 0,
      itens: row.CIENCIAS || [],
    });
  }

  static enriquecerMestre(row, agrupado, grupoOverride) {
    const numero = String(ComunicadoService.campo(row, "NUMERO_PROCESSO") || "");
    const grupo = grupoOverride || (agrupado && agrupado[numero]) || { aceites: 0, pendentes: 0, itens: [] };
    const amostra = grupo.itens[0] || {};
    const destinos = parseInt(ComunicadoService.campo(row, "QTD_DESTINATARIOS") || "0", 10) || 0;
    const pendentes = grupo.itens.length ? grupo.pendentes : Math.max(destinos - grupo.aceites, 0);
    const titulo =
      ComunicadoService.campo(row, "TITULO") ||
      ComunicadoService.campo(row, "titulo") ||
      ComunicadoService.campo(amostra, "ASSUNTO") ||
      (numero ? "Comunicado " + numero : "");
    return Object.assign({}, row, {
      NUMERO_PROCESSO: numero,
      DOCUMENTID:
        ComunicadoService.campo(row, "DOCUMENTID") ||
        ComunicadoService.campo(row, "documentid") ||
        ComunicadoService.campo(row, "cardDocumentId"),
      CARD_INDEX_DOCUMENT_ID:
        ComunicadoService.campo(row, "CARD_INDEX_DOCUMENT_ID") ||
        ComunicadoService.campo(row, "cardIndexDocumentId"),
      TITULO: titulo,
      DESCRICAO: ComunicadoService.campo(row, "DESCRICAO") || ComunicadoService.campo(row, "descricao"),
      DATA_INICIO: ComunicadoService.isoDate(
        ComunicadoService.campo(row, "DATA_INICIO") || ComunicadoService.campo(row, "data_inicio")
      ),
      DATA_CRIACAO:
        ComunicadoService.isoDate(
          ComunicadoService.campo(row, "DATA_CRIACAO") ||
            ComunicadoService.campo(row, "data_criacao") ||
            ComunicadoService.campo(amostra, "DATA_SOLICITACAO")
        ) ||
        ComunicadoService.campo(row, "DATA_CRIACAO") ||
        ComunicadoService.campo(row, "data_criacao") ||
        ComunicadoService.campo(amostra, "DATA_SOLICITACAO"),
      CRIADO_POR: ComunicadoService.campo(row, "CRIADO_POR") || ComunicadoService.campo(row, "criado_por"),
      CRIADO_POR_NOME: ComunicadoService.campo(row, "CRIADO_POR_NOME") || ComunicadoService.campo(row, "criado_por_nome"),
      DATA_FIM:
        ComunicadoService.isoDate(
          ComunicadoService.campo(row, "DATA_FIM") ||
            ComunicadoService.campo(row, "data_fim") ||
            ComunicadoService.campo(row, "dataFim")
        ) ||
        ComunicadoService.campo(row, "DATA_FIM") ||
        ComunicadoService.campo(row, "data_fim") ||
        ComunicadoService.campo(row, "dataFim"),
      SEM_DATA_EXPIRACAO: ComunicadoService.flagSN(
        ComunicadoService.campo(row, "SEM_DATA_EXPIRACAO") || ComunicadoService.campo(row, "sem_data_expiracao")
      ),
      EXIBIR_POPUP: ComunicadoService.campo(row, "EXIBIR_POPUP") || ComunicadoService.campo(row, "exibir_popup"),
      AGENDAMENTO_FUTURO: ComunicadoService.campo(row, "AGENDAMENTO_FUTURO") || ComunicadoService.campo(row, "agendamento_futuro"),
      TEXTO_BOTAO_ACAO:
        ComunicadoService.campo(row, "TEXTO_BOTAO_ACAO") ||
        ComunicadoService.campo(row, "texto_botao_acao") ||
        ComunicadoConstants.BOTAO_PADRAO,
      PUBLICO_TIPO: ComunicadoService.campo(row, "PUBLICO_TIPO") || ComunicadoService.campo(row, "publico_tipo") || "todos",
      PUBLICO_GRUPOS: ComunicadoService.campo(row, "PUBLICO_GRUPOS") || ComunicadoService.campo(row, "publico_grupos"),
      PUBLICO_USUARIOS: ComunicadoService.campo(row, "PUBLICO_USUARIOS") || ComunicadoService.campo(row, "publico_usuarios"),
      EXCECAO_GRUPOS: ComunicadoService.campo(row, "EXCECAO_GRUPOS") || ComunicadoService.campo(row, "excecao_grupos"),
      EXCECAO_USUARIOS: ComunicadoService.campo(row, "EXCECAO_USUARIOS") || ComunicadoService.campo(row, "excecao_usuarios"),
      TIPO_CONTEUDO: ComunicadoService.campo(row, "TIPO_CONTEUDO") || ComunicadoService.campo(row, "tipo_conteudo"),
      URL_CONTEUDO: ComunicadoService.campo(row, "URL_CONTEUDO") || ComunicadoService.campo(row, "url_conteudo"),
      DOCUMENTOS_ANEXOS: ComunicadoService.campo(row, "DOCUMENTOS_ANEXOS") || ComunicadoService.campo(row, "documentos_anexos"),
      STATUS: ComunicadoService.statusEfetivo(row),
      CANCELADO: ComunicadoService.campo(row, "CANCELADO") || ComunicadoService.campo(row, "cancelado"),
      EXCLUIDO: ComunicadoService.campo(row, "EXCLUIDO") || ComunicadoService.campo(row, "excluido"),
      QTD_ACEITES: grupo.aceites,
      QTD_PENDENTES: pendentes,
      CIENCIAS: grupo.itens,
    });
  }

  static filtrarMestres(lista, filters = {}) {
    const titulo = String(filters.titulo || "").toLowerCase();
    const dataInicial = ComunicadoService.isoDate(filters.data_inicial);
    const dataFinal = ComunicadoService.isoDate(filters.data_final);
    const criadoPor = String(filters.criado_por || "");
    const status = String(filters.status || "").toUpperCase();
    const expiracao = String(filters.expiracao || "");
    const aceite = String(filters.aceite || "");

    return (lista || []).filter((el) => {
      if (titulo && String(el.TITULO || "").toLowerCase().indexOf(titulo) === -1) return false;
      const criacao = ComunicadoService.isoDate(el.DATA_CRIACAO);
      if (dataInicial && (!criacao || criacao < dataInicial)) return false;
      if (dataFinal && (!criacao || criacao > dataFinal)) return false;
      if (criadoPor && String(el.CRIADO_POR || "") !== criadoPor) return false;
      if (status && String(el.STATUS || "").toUpperCase() !== status) return false;
      if (expiracao === "S" && el.SEM_DATA_EXPIRACAO !== "S") return false;
      if (expiracao === "N" && el.SEM_DATA_EXPIRACAO === "S") return false;
      if (aceite === "com" && !(el.QTD_ACEITES > 0)) return false;
      if (aceite === "sem" && el.QTD_ACEITES > 0) return false;
      return true;
    });
  }

  static async criar(formFields) {
    const codigoProcesso = await ComunicadoService.resolverCodigoProcesso();
    const erros = [];
    const payloads = ComunicadoService.montarPayloadsInicio(formFields);

    for (var i = 0; i < payloads.length; i++) {
      try {
        const processId = await ComunicadoService.criarViaApi(payloads[i], codigoProcesso);
        if (processId) {
          ComunicadoService.gravarMarcacao(processId, ComunicadoService.marcacaoDaFicha(formFields));
          return processId;
        }
      } catch (apiError) {
        console.error("ComunicadoService.criarViaApi", codigoProcesso, payloads[i], apiError);
        erros.push(ComunicadoService.erroTexto(apiError));
      }
    }

    try {
      const processId = await ComunicadoService.criarViaDataset(payloads[0], codigoProcesso);
      if (processId) {
        ComunicadoService.gravarMarcacao(processId, ComunicadoService.marcacaoDaFicha(formFields));
        return processId;
      }
    } catch (dsError) {
      console.error("ComunicadoService.criarViaDataset", codigoProcesso, dsError);
      erros.push(ComunicadoService.erroTexto(dsError));
    }

    throw ComunicadoService.mensagemFalhaInicio(codigoProcesso, erros);
  }

  static async editar(record, formFields) {
    const dados = await ComunicadoService.resolverDadosFicha(record);
    const campos = ComunicadoService.montarFormFieldsEdicao(formFields, record);
    await ComunicadoService.atualizarFicha(dados.cardId, campos, dados);
    await ComunicadoService.atualizarCienciasPendentes(record, formFields);
    ComunicadoService.gravarMarcacao(record.NUMERO_PROCESSO, ComunicadoService.marcacaoDaFicha(formFields, record));
    return record.NUMERO_PROCESSO;
  }

  static async cancelar(record) {
    return ComunicadoService.marcarComunicado(record, {
      cancelado: "S",
      status: ComunicadoConstants.STATUS.CANCELADO,
      publicado: "N",
      campo_descritor: ComunicadoService.descritorComunicado(record.TITULO || record.NUMERO_PROCESSO),
    }, false);
  }

  static async excluir(record) {
    return ComunicadoService.marcarComunicado(record, {
      excluido: "S",
      cancelado: "S",
      status: ComunicadoConstants.STATUS.CANCELADO,
      publicado: "N",
    }, true);
  }

  static async marcarComunicado(record, campos, excluir) {
    const dados = await ComunicadoService.resolverDadosFicha(record);
    const numero = String(dados.numero || record.NUMERO_PROCESSO || "");
    var persistiu = false;
    const erros = [];

    try {
      await ComunicadoService.atualizarFicha(dados.cardId, campos, dados);
      persistiu = true;
    } catch (e) {
      erros.push(ComunicadoService.erroTexto(e));
    }

    try {
      await ComunicadoService.cancelarSolicitacao(numero);
      persistiu = true;
    } catch (eCancel) {
      const texto = ComunicadoService.erroTexto(eCancel);
      if (texto && !/already|cancelad|finaliz|encerr/i.test(texto)) {
        erros.push(texto);
      }
    }

    ComunicadoService.gravarMarcacao(numero, {
      cancelado: "S",
      excluido: excluir ? "S" : "N",
      status: ComunicadoConstants.STATUS.CANCELADO,
    });
    console.log("ComunicadoService.marcarComunicado", numero, { persistiu, excluir: !!excluir, erros: erros });
    return numero;
  }

  static montarFormFieldsEdicao(form, record) {
    const fields = ComunicadoService.montarFormFields(form, {
      criado_por: record.CRIADO_POR,
      criado_por_nome: record.CRIADO_POR_NOME,
      data_criacao: record.DATA_CRIACAO,
    });
    delete fields.usuarios_disparados;
    delete fields.qtd_destinatarios;
    delete fields.publicado;
    delete fields.cancelado;
    delete fields.excluido;
    fields.status = record.STATUS === ComunicadoConstants.STATUS.CANCELADO ? record.STATUS : record.STATUS || fields.status;
    if (record.STATUS === ComunicadoConstants.STATUS.ATIVO) {
      fields.status = ComunicadoConstants.STATUS.ATIVO;
      fields.publicado = "S";
    }
    return fields;
  }

  static async resolverDadosFicha(record) {
    const numero = String(ComunicadoService.campo(record, "NUMERO_PROCESSO") || "");
    var cardId =
      ComunicadoService.campo(record, "DOCUMENTID") ||
      ComunicadoService.campo(record, "documentid") ||
      ComunicadoService.campo(record, "cardDocumentId");
    var cardIndexId =
      ComunicadoService.campo(record, "CARD_INDEX_DOCUMENT_ID") ||
      ComunicadoService.campo(record, "cardIndexDocumentId");

    if (numero) {
      const proc = await ComunicadoService.buscarLinhaProcesso(numero);
      if (proc) {
        cardId =
          ComunicadoService.campo(proc, "cardDocumentId") ||
          ComunicadoService.campo(proc, "documentId") ||
          ComunicadoService.campo(proc, "cardId") ||
          cardId;
        cardIndexId = ComunicadoService.campo(proc, "cardIndexDocumentId") || cardIndexId;
      }
    }

    if (!cardId) {
      throw "Não foi possível localizar a ficha do comunicado" + (numero ? " " + numero : "") + ".";
    }
    return {
      cardId: String(cardId),
      cardIndexId: String(cardIndexId || ""),
      numero: numero,
    };
  }

  static async resolverCardId(record) {
    const dados = await ComunicadoService.resolverDadosFicha(record);
    return dados.cardId;
  }

  static async buscarLinhaProcesso(numero) {
    const tentativas = [
      { "workflowProcessPK.processInstanceId": { initialValue: String(numero), finalValue: String(numero) } },
      { processInstanceId: { initialValue: String(numero), finalValue: String(numero) } },
    ];
    for (var i = 0; i < tentativas.length; i++) {
      try {
        const data = await ComunicadoService.consultarDataset("workflowProcess", tentativas[i]);
        if (data && data[0] && !data[0].ERRO) {
          return data[0];
        }
      } catch (e) {
        console.error("ComunicadoService.buscarLinhaProcesso", tentativas[i], e);
      }
    }
    return null;
  }

  static async cardIdDoProcesso(numero) {
    const proc = await ComunicadoService.buscarLinhaProcesso(numero);
    return (
      ComunicadoService.campo(proc, "cardDocumentId") ||
      ComunicadoService.campo(proc, "documentId") ||
      ComunicadoService.campo(proc, "cardId") ||
      ""
    );
  }

  static async atualizarCienciasPendentes(record, form) {
    const ciencias = record.CIENCIAS || [];
    const copia = {
      assunto: form.titulo || "",
      observacao: form.descricao || "",
      campo_descritor: ComunicadoService.descritorCiencia(form.titulo),
      documentos_anexos: ComunicadoService.toCardValue(form.documentos_anexos || []),
      tipo_conteudo: form.tipo_conteudo || "pdf",
      url_conteudo: form.url_conteudo || "",
      texto_botao_acao: form.texto_botao_acao || ComunicadoConstants.BOTAO_PADRAO,
      exibir_popup: form.exibir_popup === "S" ? "S" : "N",
    };

    for (var i = 0; i < ciencias.length; i++) {
      if (ComunicadoService.aceitou(ciencias[i])) {
        continue;
      }
      try {
        const numero = ComunicadoService.campo(ciencias[i], "NUMERO_PROCESSO");
        const proc = numero ? await ComunicadoService.buscarLinhaProcesso(numero) : null;
        const cardId =
          ComunicadoService.campo(ciencias[i], "DOCUMENTID") ||
          ComunicadoService.campo(ciencias[i], "documentid") ||
          ComunicadoService.campo(proc, "cardDocumentId") ||
          "";
        if (!cardId) {
          continue;
        }
        await ComunicadoService.atualizarFicha(cardId, copia, {
          cardIndexId: ComunicadoService.campo(proc, "cardIndexDocumentId"),
          numero: numero,
        });
      } catch (e) {
        console.error("ComunicadoService.atualizarCienciasPendentes", ciencias[i], e);
      }
    }
  }

  static async atualizarFicha(documentId, campos, extra) {
    const meta = extra && typeof extra === "object" ? extra : { cardIndexId: extra || "" };
    const id = String(documentId || meta.cardId || "");
    const cardIndexId = String(meta.cardIndexId || "");
    const values = Object.keys(campos || {}).map(function (key) {
      return { fieldId: key, value: ComunicadoService.toCardValue(campos[key]) };
    });

    const tentativas = [{ tipo: "soap" }];
    if (cardIndexId) {
      tentativas.push({
        tipo: "json",
        method: "PUT",
        url: "/api/public/2.0/cardindexes/" + cardIndexId + "/cards/" + id,
        body: { id: Number(id) || id, values: values },
      });
    }

    const erros = [];
    for (var i = 0; i < tentativas.length; i++) {
      try {
        if (tentativas[i].tipo === "soap") {
          await ComunicadoService.atualizarFichaSoap(id, campos);
          return { ok: true, via: "soap" };
        }
        const json = await ComunicadoService.ajaxJson(
          ComunicadoService.fluigUrl(tentativas[i].url),
          tentativas[i].body,
          tentativas[i].method
        );
        if (json && json.code && /NotFoundException/i.test(String(json.code))) {
          throw json;
        }
        if (json && (json.message || json.detailedMessage) && String(json.status).toUpperCase() === "ERROR") {
          throw ComunicadoService.mensagemApi(json);
        }
        return json || { ok: true, via: "json" };
      } catch (e) {
        const texto = ComunicadoService.erroTexto(e);
        if (/NotFoundException/i.test(texto)) {
          continue;
        }
        console.warn("ComunicadoService.atualizarFicha", tentativas[i].url || "soap", texto);
        erros.push(texto);
      }
    }
    throw (
      "Não foi possível gravar a ficha " +
      id +
      (erros.length ? ". " + erros[erros.length - 1] : ".")
    );
  }

  static chaveMarcacoes() {
    const wcm = (top && top.WCMAPI) || window.WCMAPI || {};
    return "comunicadoMarcacoes:" + (wcm.organizationId || wcm.tenantCode || "faeg");
  }

  static lerMarcacoes() {
    try {
      return JSON.parse(localStorage.getItem(ComunicadoService.chaveMarcacoes()) || "{}");
    } catch (e) {
      return {};
    }
  }

  static gravarMarcacao(numero, patch) {
    const chave = String(numero || "");
    if (!chave) return;
    const mapa = ComunicadoService.lerMarcacoes();
    mapa[chave] = Object.assign({}, mapa[chave] || {}, patch || {}, { at: Date.now() });
    try {
      localStorage.setItem(ComunicadoService.chaveMarcacoes(), JSON.stringify(mapa));
    } catch (e) {
      console.warn("ComunicadoService.gravarMarcacao", e);
    }
  }

  static aplicarMarcacoes(mestres) {
    const mapa = ComunicadoService.lerMarcacoes();
    return (mestres || []).map(function (row) {
      const marca = mapa[String(row.NUMERO_PROCESSO || "")];
      if (!marca) return row;
      const excluido = marca.excluido === "S" ? "S" : row.EXCLUIDO;
      const cancelado = marca.cancelado === "S" || excluido === "S" ? "S" : row.CANCELADO;
      return Object.assign({}, row, {
        CANCELADO: cancelado,
        EXCLUIDO: excluido,
        STATUS:
          cancelado === "S" || String(marca.status || "").toUpperCase() === "CANCELADO"
            ? ComunicadoConstants.STATUS.CANCELADO
            : row.STATUS,
        DATA_FIM: row.DATA_FIM || marca.data_fim || "",
        SEM_DATA_EXPIRACAO: row.SEM_DATA_EXPIRACAO || marca.sem_data_expiracao || "",
        CRIADO_POR_NOME: row.CRIADO_POR_NOME || marca.criado_por_nome || "",
        CRIADO_POR: row.CRIADO_POR || marca.criado_por || "",
        DATA_CRIACAO: row.DATA_CRIACAO || marca.data_criacao || "",
        TITULO: row.TITULO || marca.titulo || "",
      });
    });
  }

  static async lerFicha(cardId, cardIndexId, numero) {
    const mapa = {};
    const mesclar = function (extra) {
      Object.keys(extra || {}).forEach(function (k) {
        if (extra[k] == null || extra[k] === "") return;
        if (mapa[k] == null || mapa[k] === "") mapa[k] = extra[k];
      });
    };

    var formRecordId = cardId;
    var formId = cardIndexId;
    const urls = [];
    if (numero) {
      urls.push(
        "/process-management/api/v2/requests/" + encodeURIComponent(String(numero)) + "?expand=formFields"
      );
      urls.push("/process-management/api/v2/requests/" + encodeURIComponent(String(numero)));
    }
    if (cardIndexId && cardId) {
      urls.push("/api/public/2.0/cardindexes/" + cardIndexId + "/cards/" + cardId);
    }
    if (cardId) {
      urls.push("/api/public/2.0/cards/" + cardId);
    }

    for (var i = 0; i < urls.length; i++) {
      try {
        const json = await ComunicadoService.ajaxGet(ComunicadoService.fluigUrl(urls[i]));
        const raiz = json && json.content && typeof json.content === "object" ? json.content : json;
        if (raiz && typeof raiz === "object") {
          if (raiz.formRecordId) formRecordId = raiz.formRecordId;
          if (raiz.formId) formId = raiz.formId;
        }
        mesclar(ComunicadoService.mapaDeFormulario(json));
        if (ComunicadoService.mapaTemFicha(mapa)) {
          break;
        }
      } catch (e) {
        const texto = ComunicadoService.erroTexto(e);
        if (!/NotFoundException|404|HTTP 404/i.test(texto)) {
          console.warn("ComunicadoService.lerFicha", urls[i], texto);
        }
      }
    }

    if (!ComunicadoService.mapaTemFicha(mapa) && formId && formRecordId) {
      try {
        const json = await ComunicadoService.ajaxGet(
          ComunicadoService.fluigUrl("/api/public/2.0/cardindexes/" + formId + "/cards/" + formRecordId)
        );
        mesclar(ComunicadoService.mapaDeFormulario(json));
      } catch (eCard) {
        const texto = ComunicadoService.erroTexto(eCard);
        if (!/NotFoundException|404|HTTP 404/i.test(texto)) {
          console.warn("ComunicadoService.lerFicha cardindexes", texto);
        }
      }
    }

    if (!ComunicadoService.mapaTemFicha(mapa) && numero) {
      try {
        mesclar(await ComunicadoService.lerFichaWorkflow(numero));
      } catch (eWf) {
        console.warn("ComunicadoService.lerFicha workflow", ComunicadoService.erroTexto(eWf));
      }
    }

    if (!ComunicadoService.mapaTemFicha(mapa) && (cardId || formRecordId)) {
      try {
        mesclar(await ComunicadoService.lerFichaCardValue(cardId || formRecordId));
      } catch (eVal) {
        console.warn("ComunicadoService.lerFicha getCardValue", ComunicadoService.erroTexto(eVal));
      }
    }

    if (!Object.keys(mapa).length) {
      return null;
    }
    mapa.documentid = String(cardId || mapa.documentid || formRecordId || "");
    mapa.DOCUMENTID = mapa.documentid;
    if (cardIndexId || formId) mapa.cardIndexDocumentId = String(cardIndexId || formId);
    if (numero) mapa.numero_processo = String(numero);
    return mapa;
  }

  static mapaTemFicha(mapa) {
    if (!mapa) return false;
    const campos = [
      "titulo",
      "TITULO",
      "data_fim",
      "DATA_FIM",
      "data_inicio",
      "descricao",
      "criado_por_nome",
      "sem_data_expiracao",
      "texto_botao_acao",
      "tipo_conteudo",
      "publico_tipo",
    ];
    for (var i = 0; i < campos.length; i++) {
      if (mapa[campos[i]] != null && String(mapa[campos[i]]) !== "") return true;
    }
    return false;
  }

  static mapaDeFormulario(json) {
    if (!json || typeof json !== "object") return {};
    const raiz = json.content && typeof json.content === "object" ? json.content : json;
    const candidatos = [raiz.formFields, raiz.formData, raiz.fields, raiz.values];
    if (raiz.content && typeof raiz.content === "object") {
      candidatos.push(raiz.content.formFields, raiz.content.values, raiz.content.fields);
    }
    const mapa = {};
    for (var c = 0; c < candidatos.length; c++) {
      const fields = candidatos[c];
      if (!fields) continue;
      if (Array.isArray(fields)) {
        fields.forEach(function (item) {
          if (!item || typeof item !== "object") return;
          const k = item.fieldId || item.field || item.key || item.name;
          const v = item.value != null ? item.value : item.val;
          if (k && v != null && String(v) !== "") {
            mapa[k] = v;
          }
        });
      } else if (typeof fields === "object") {
        Object.keys(fields).forEach(function (k) {
          if (k === "values" || k === "formFields" || k === "formData" || k === "content") return;
          const bruto = fields[k];
          const v = bruto && typeof bruto === "object" && bruto.value != null ? bruto.value : bruto;
          if (v != null && typeof v !== "object" && String(v) !== "") {
            mapa[k] = v;
          }
        });
      }
      if (ComunicadoService.mapaTemFicha(mapa)) {
        break;
      }
    }
    return mapa;
  }

  static async lerFichaWorkflow(numero) {
    const cred = ComunicadoService.soapCredenciais();
    const envelope =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://ws.workflow.ecm.technology.totvs.com/">' +
      "<soapenv:Header/>" +
      "<soapenv:Body>" +
      "<ws:getInstanceCardData>" +
      "<username>" +
      ComunicadoService.escapeXml(cred.username) +
      "</username>" +
      "<password></password>" +
      "<companyId>" +
      cred.companyId +
      "</companyId>" +
      "<processInstanceId>" +
      ComunicadoService.escapeXml(String(numero)) +
      "</processInstanceId>" +
      "</ws:getInstanceCardData>" +
      "</soapenv:Body>" +
      "</soapenv:Envelope>";
    const texto = await ComunicadoService.ajaxSoap(
      ComunicadoService.fluigUrl("/webdesk/WorkflowEngineService"),
      envelope
    );
    ComunicadoService.validarSoap(texto);
    return ComunicadoService.parseCardDataXml(texto);
  }

  static async lerFichaCardValue(documentId) {
    const campos = [
      "titulo",
      "data_fim",
      "data_inicio",
      "sem_data_expiracao",
      "criado_por",
      "criado_por_nome",
      "data_criacao",
      "descricao",
      "status",
      "cancelado",
      "excluido",
      "tipo_conteudo",
      "texto_botao_acao",
      "publico_tipo",
    ];
    const mapa = {};
    const cred = ComunicadoService.soapCredenciais();
    for (var i = 0; i < campos.length; i++) {
      const envelope =
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://ws.dm.ecm.technology.totvs.com/">' +
        "<soapenv:Header/>" +
        "<soapenv:Body>" +
        "<ws:getCardValue>" +
        "<companyId>" +
        cred.companyId +
        "</companyId>" +
        "<username>" +
        ComunicadoService.escapeXml(cred.username) +
        "</username>" +
        "<password></password>" +
        "<cardId>" +
        ComunicadoService.escapeXml(String(documentId)) +
        "</cardId>" +
        "<cardField>" +
        campos[i] +
        "</cardField>" +
        "</ws:getCardValue>" +
        "</soapenv:Body>" +
        "</soapenv:Envelope>";
      try {
        const texto = await ComunicadoService.ajaxSoap(ComunicadoService.fluigUrl("/webdesk/ECMCardService"), envelope);
        ComunicadoService.validarSoap(texto);
        const valor = ComunicadoService.parseSoapReturn(texto);
        if (valor) mapa[campos[i]] = valor;
      } catch (e) {
        const texto = ComunicadoService.erroTexto(e);
        if (/not recognized|Does it exist in service WSDL/i.test(texto)) {
          break;
        }
        if (i === 0) {
          throw e;
        }
      }
    }
    return mapa;
  }

  static parseSoapReturn(texto) {
    const xml = String(texto || "");
    const m = xml.match(/<(?:\w+:)?return\b[^>]*>([\s\S]*?)<\/(?:\w+:)?return>/i);
    if (!m) return "";
    return ComunicadoService.unescapeXml(
      String(m[1] || "")
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .replace(/<[^>]+>/g, "")
        .trim()
    );
  }

  static marcacaoDaFicha(form, record) {
    const wcm = (top && top.WCMAPI) || window.WCMAPI || {};
    return {
      data_fim: form && form.sem_data_expiracao === "S" ? "" : (form && form.data_fim) || "",
      sem_data_expiracao: form && form.sem_data_expiracao === "S" ? "S" : "N",
      criado_por_nome:
        (record && record.CRIADO_POR_NOME) ||
        (form && form.criado_por_nome) ||
        wcm.user ||
        "",
      criado_por: (record && record.CRIADO_POR) || wcm.userCode || "",
      data_criacao: (record && record.DATA_CRIACAO) || (form && form.data_criacao) || ComunicadoService.agoraCard(),
      titulo: (form && form.titulo) || (record && record.TITULO) || "",
    };
  }

  static async lerFichaSoap(documentId) {
    const cred = ComunicadoService.soapCredenciais();
    const empresas = [];
    [cred.companyId, 1].forEach(function (id) {
      if (id != null && String(id) !== "" && empresas.indexOf(String(id)) === -1) {
        empresas.push(String(id));
      }
    });
    var ultimo = {};
    for (var e = 0; e < empresas.length; e++) {
      const envelope =
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://ws.dm.ecm.technology.totvs.com/">' +
        "<soapenv:Header/>" +
        "<soapenv:Body>" +
        "<ws:getCardData>" +
        "<companyId>" +
        empresas[e] +
        "</companyId>" +
        "<username>" +
        ComunicadoService.escapeXml(cred.username) +
        "</username>" +
        "<password></password>" +
        "<cardId>" +
        ComunicadoService.escapeXml(String(documentId)) +
        "</cardId>" +
        "</ws:getCardData>" +
        "</soapenv:Body>" +
        "</soapenv:Envelope>";
      const texto = await ComunicadoService.ajaxSoap(ComunicadoService.fluigUrl("/webdesk/ECMCardService"), envelope);
      ComunicadoService.validarSoap(texto);
      const mapa = ComunicadoService.parseCardDataXml(texto);
      if (
        mapa &&
        (mapa.data_fim ||
          mapa.DATA_FIM ||
          mapa.criado_por ||
          mapa.criado_por_nome ||
          mapa.titulo ||
          Object.keys(mapa).length > 3)
      ) {
        return mapa;
      }
      ultimo = mapa || {};
    }
    return ultimo;
  }

  static parseCardDataXml(texto) {
    const mapa = {};
    const xml = String(texto || "");
    const limpar = function (valor) {
      return ComunicadoService.unescapeXml(
        String(valor || "")
          .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
          .replace(/<[^>]+>/g, "")
          .trim()
      );
    };
    const gravar = function (chave, valor) {
      const k = String(chave || "").trim();
      const v = limpar(valor);
      if (!k || !v) return;
      mapa[k] = v;
    };

    const reName = /<(?:\w+:)?value[^>]*\bname="([^"]+)"[^>]*>([\s\S]*?)<\/(?:\w+:)?value>/gi;
    var m;
    while ((m = reName.exec(xml))) {
      gravar(m[1], m[2]);
    }

    const reItem = /<(?:\w+:)?item\b[^>]*>([\s\S]*?)<\/(?:\w+:)?item>/gi;
    while ((m = reItem.exec(xml))) {
      const inner = m[1];
      if (/<(?:\w+:)?item\b/i.test(inner)) continue;
      const field = (inner.match(/<(?:\w+:)?(?:field|key)[^>]*>([^<]+)/i) || [])[1];
      const nameAttr = (inner.match(/<(?:\w+:)?value[^>]*\bname="([^"]+)"/i) || [])[1];
      const valMatch = inner.match(/<(?:\w+:)?value\b[^>]*>([\s\S]*?)<\/(?:\w+:)?value>/i);
      gravar(field || nameAttr, valMatch ? valMatch[1] : "");
    }

    if (!Object.keys(mapa).length) {
      const re = /<(?:\w+:)?(?:field|key)[^>]*>([^<]+)<\/(?:\w+:)?(?:field|key)>([\s\S]*?)<(?:\w+:)?value\b[^>]*>([\s\S]*?)<\/(?:\w+:)?value>/gi;
      while ((m = re.exec(xml))) {
        gravar(m[1], m[3]);
      }
    }

    const reKv = /<(?:\w+:)?(?:key|itemKey)[^>]*>([^<]+)<\/(?:\w+:)?(?:key|itemKey)>\s*<(?:\w+:)?(?:value|itemValue)\b[^>]*>([\s\S]*?)<\/(?:\w+:)?(?:value|itemValue)>/gi;
    while ((m = reKv.exec(xml))) {
      gravar(m[1], m[2]);
    }
    return mapa;
  }

  static async cancelarSolicitacao(numero) {
    const id = String(numero || "");
    if (!id) return;
    const wcm = (top && top.WCMAPI) || window.WCMAPI || {};
    const user = wcm.userCode || wcm.userLogin || "";
    const json = await ComunicadoService.ajaxJson(
      ComunicadoService.fluigUrl("/process-management/api/v2/requests/" + encodeURIComponent(id) + "/cancel"),
      { replacementId: user, comment: "Cancelado pelo painel Comunicado e Ciência" },
      "POST"
    );
    if (json && json.code && /NotFoundException/i.test(String(json.code))) {
      throw json;
    }
    if (json && String(json.status || "").toUpperCase() === "ERROR") {
      throw ComunicadoService.mensagemApi(json) || json.code;
    }
    return json || { ok: true };
  }

  static soapCredenciais() {
    const wcm = (top && top.WCMAPI) || window.WCMAPI || {};
    const companyId = /^\d+$/.test(String(wcm.organizationId || ""))
      ? wcm.organizationId
      : /^\d+$/.test(String(wcm.tenantId || ""))
        ? wcm.tenantId
        : 1;
    return { companyId: companyId, username: wcm.userLogin || wcm.userCode || "" };
  }

  static validarSoap(texto) {
    const xml = String(texto || "");
    if (/<html[\s>]/i.test(xml)) {
      throw "O ECMCardService devolveu uma página HTML em vez do SOAP.";
    }
    if (/faultstring|Fault>/i.test(xml)) {
      throw xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 280);
    }
  }

  static unescapeXml(value) {
    return String(value == null ? "" : value)
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
  }

  static async atualizarFichaSoap(documentId, campos) {
    const cred = ComunicadoService.soapCredenciais();
    const itens = Object.keys(campos || {})
      .map(function (key) {
        const valor = ComunicadoService.escapeXml(ComunicadoService.toCardValue(campos[key]));
        return (
          "<item><field>" +
          ComunicadoService.escapeXml(key) +
          "</field><value>" +
          valor +
          "</value></item>"
        );
      })
      .join("");

    const envelope =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://ws.dm.ecm.technology.totvs.com/">' +
      "<soapenv:Header/>" +
      "<soapenv:Body>" +
      "<ws:updateCardData>" +
      "<companyId>" +
      cred.companyId +
      "</companyId>" +
      "<username>" +
      ComunicadoService.escapeXml(cred.username) +
      "</username>" +
      "<password></password>" +
      "<cardId>" +
      ComunicadoService.escapeXml(String(documentId)) +
      "</cardId>" +
      "<cardData>" +
      itens +
      "</cardData>" +
      "</ws:updateCardData>" +
      "</soapenv:Body>" +
      "</soapenv:Envelope>";

    const texto = await ComunicadoService.ajaxSoap(ComunicadoService.fluigUrl("/webdesk/ECMCardService"), envelope);
    ComunicadoService.validarSoap(texto);
    return texto;
  }

  static escapeXml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  static ajaxSoap(url, xml) {
    return new Promise(function (resolve, reject) {
      $.ajax({
        url: url,
        type: "POST",
        data: xml,
        contentType: "text/xml; charset=UTF-8",
        headers: { SOAPAction: "" },
        xhrFields: { withCredentials: true },
        success: function (_data, _status, xhr) {
          resolve(xhr.responseText || "");
        },
        error: function (xhr) {
          reject(
            (xhr.responseText && String(xhr.responseText).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 280)) ||
              xhr.statusText ||
              "HTTP " + xhr.status
          );
        },
      });
    });
  }

  static async resolverCodigoProcesso() {
    if (ComunicadoService._codigoProcesso) {
      return ComunicadoService._codigoProcesso;
    }

    const preferido = ComunicadoConstants.PROCESS_GESTOR;
    try {
      const json = await ComunicadoService.ajaxGet(
        ComunicadoService.fluigUrl("/process-management/api/v2/processes/" + encodeURIComponent(preferido))
      );
      if (json && (json.processId || json.id || json.processDescription || json.content)) {
        ComunicadoService._codigoProcesso = preferido;
        return preferido;
      }
    } catch (e) {
      console.error("ComunicadoService.resolverCodigoProcesso GET", preferido, e);
    }

    const candidatos = await ComunicadoService.listarProcessosPublicados();
    const match =
      ComunicadoService.escolherProcesso(candidatos, preferido) ||
      ComunicadoService.escolherProcesso(candidatos, "Comunicado e Ciência");

    if (match) {
      ComunicadoService._codigoProcesso = match;
      return match;
    }

    const nomes = candidatos
      .slice(0, 15)
      .map(function (el) {
        return el.processId || el.id || "";
      })
      .filter(Boolean)
      .join(", ");

    throw (
      "O processo " +
      preferido +
      " não está publicado neste Fluig (ou você não tem permissão para iniciá-lo). " +
      "Publicar só o formulário não basta: no Studio, abra o processo GestorConfirmarCiencia, vincule o formulário de mesmo código e use Exportar/Publicar. " +
      (nomes ? "Processos visíveis para o seu usuário: " + nomes + "." : "Nenhum processo iniciável foi retornado pela API.")
    );
  }

  static escolherProcesso(lista, termo) {
    const needle = String(termo || "").toLowerCase().replace(/\s+/g, "");
    if (!needle || !lista || !lista.length) {
      return "";
    }

    const exato = lista.find(function (el) {
      const id = String(el.processId || el.id || "").toLowerCase();
      return id === String(termo).toLowerCase();
    });
    if (exato) {
      return exato.processId || exato.id;
    }

    const parcial = lista.find(function (el) {
      const id = String(el.processId || el.id || "").toLowerCase().replace(/\s+/g, "");
      const desc = String(el.processDescription || el.description || el.name || "").toLowerCase().replace(/\s+/g, "");
      return id.indexOf(needle) !== -1 || desc.indexOf(needle) !== -1;
    });
    return parcial ? parcial.processId || parcial.id : "";
  }

  static async listarProcessosPublicados() {
    const urls = [
      "/process-management/api/v2/processes?page=1&pageSize=200&active=true",
      "/process-management/api/v2/requests/startable-processes?page=1&pageSize=200",
      "/api/public/2.0/workflows/availableProcesses",
    ];
    const lista = [];

    for (var i = 0; i < urls.length; i++) {
      try {
        const json = await ComunicadoService.ajaxGet(ComunicadoService.fluigUrl(urls[i]));
        const itens = ComunicadoService.extrairListaProcessos(json);
        for (var j = 0; j < itens.length; j++) {
          lista.push(itens[j]);
        }
        if (itens.length) {
          break;
        }
      } catch (e) {
        console.error("ComunicadoService.listarProcessosPublicados", urls[i], e);
      }
    }

    if (!lista.length && typeof DatasetFactory !== "undefined") {
      try {
        const ds = DatasetFactory.getDataset("processDefinition", null, null, null);
        const rows = (ds && ds.values) || [];
        for (var r = 0; r < rows.length; r++) {
          lista.push({
            processId: rows[r]["processDefinitionPK.processId"] || rows[r].processId,
            processDescription: rows[r].processDescription || rows[r].description,
          });
        }
      } catch (eDs) {
        console.error("ComunicadoService.processDefinition", eDs);
      }
    }

    return lista;
  }

  static extrairListaProcessos(json) {
    if (!json) {
      return [];
    }
    if (Array.isArray(json)) {
      return json;
    }
    if (Array.isArray(json.items)) {
      return json.items;
    }
    if (Array.isArray(json.content)) {
      return json.content;
    }
    if (json.content && Array.isArray(json.content.items)) {
      return json.content.items;
    }
    if (json.content && Array.isArray(json.content.processList)) {
      return json.content.processList;
    }
    return [];
  }

  static async criarViaApi(payload, codigoProcesso) {
    const codigo = codigoProcesso || ComunicadoConstants.PROCESS_GESTOR;
    const json = await ComunicadoService.ajaxJson(
      ComunicadoService.fluigUrl("/process-management/api/v2/processes/" + encodeURIComponent(codigo) + "/start"),
      payload
    );
    const processId = json.processInstanceId || (json.content && json.content.processInstanceId);
    if (!processId) {
      throw ComunicadoService.mensagemApi(json) || "A API de processo não retornou o número da solicitação.";
    }
    return String(processId);
  }

  static async criarViaDataset(payload, codigoProcesso) {
    const codigo = codigoProcesso || ComunicadoConstants.PROCESS_GESTOR;
    const startProcess = await FluigUtils.genericRestDatasetCall({
      dataset: ComunicadoConstants.DATASETS.START_PROCESS,
      fields: [JSON.stringify(payload)],
      constraints: { processId: codigo },
    });
    const row = (startProcess && startProcess[0]) || {};
    if (row.CODRETORNO === "ERROR" || row.codretorno === "ERROR") {
      throw row.DESCRETORNO || row.descretorno || "dsStartProcessGlobalREST retornou erro.";
    }
    const raw = row.DESCRETORNO || row.descretorno;
    if (!raw) {
      throw "dsStartProcessGlobalREST não retornou o número da solicitação.";
    }
    const jsonData = typeof raw === "string" ? JSON.parse(raw) : raw;
    const processId = jsonData.processInstanceId || (jsonData.content && jsonData.content.processInstanceId);
    if (!processId) {
      throw ComunicadoService.mensagemApi(jsonData) || String(raw);
    }
    return String(processId);
  }

  static mensagemFalhaInicio(codigoProcesso, erros) {
    const texto = erros.filter(Boolean).join(" | ");
    const edicao =
      /modo de edi[cç][aã]o|vers[aã]o da solicita[cç][aã]o n[aã]o/i.test(texto);

    if (edicao) {
      return (
        "O processo " +
        codigoProcesso +
        " está no Fluig em modo de edição, então não dá para iniciar solicitação. " +
        "No Studio, exporte de novo desmarcando “manter em modo de edição”. " +
        "Ou no portal: Painel de Controle → Processos → GestorConfirmarCiencia → Versões → Liberar a versão. " +
        "Confira em Solicitações → Iniciar se “Comunicado e Ciência” aparece. " +
        texto
      );
    }

    return (
      "O Fluig recusou o início do processo " +
      codigoProcesso +
      ". " +
      texto +
      ( /502|proxy error/i.test(texto)
        ? " O cadastro pode ter sido criado mesmo assim: confira em Solicitações se o comunicado aparece. O 502 costuma ocorrer quando a atividade 7 tenta disparar ciências para todo o público na mesma requisição."
        : "" )
    );
  }

  static montarPayloadsInicio(formFields) {
    const campos = ComunicadoService.normalizarFormFields(formFields);
    const comment = ComunicadoService.descritorComunicado(campos.titulo);
    return [
      {
        comment: comment,
        formFields: campos,
        subProcessTargetState: 0,
      },
      {
        comment: comment,
        formFields: campos,
      },
    ];
  }

  static normalizarFormFields(formFields) {
    const campos = {};
    Object.keys(formFields || {}).forEach(function (key) {
      campos[key] = ComunicadoService.toCardValue(formFields[key]);
    });
    return campos;
  }

  static async uploadGed(file) {
    try {
      return await ComunicadoService.uploadGedNativo(file);
    } catch (apiError) {
      console.error("ComunicadoService.uploadGedNativo", apiError);
      throw "Falha ao gravar o anexo na pasta GED. " + ComunicadoService.erroTexto(apiError);
    }
  }

  static async uploadGedNativo(file) {
    const formData = new FormData();
    formData.append("file", file, file.name);

    const uploaded = await ComunicadoService.ajaxForm(ComunicadoService.fluigUrl("/ecm/upload"), formData);
    const files = (uploaded && uploaded.files) || (uploaded && uploaded.content && uploaded.content.files) || [];
    const uploadedFile = files[0];
    if (!uploadedFile || !uploadedFile.name) {
      throw "O upload temporário não retornou o arquivo.";
    }
    if (Number(uploadedFile.size) === 0) {
      throw "O arquivo enviado está vazio.";
    }

    const created = await ComunicadoService.ajaxJson(ComunicadoService.fluigUrl("/api/public/ecm/document/createDocument"), {
      description: file.name.replace(/\.[^/.]+$/, "") || uploadedFile.name,
      parentId: ComunicadoConstants.GED_FOLDER_ID,
      colleagueId: top.WCMAPI.userCode,
      publisherId: top.WCMAPI.userCode,
      downloadEnabled: true,
      attachments: [{ fileName: uploadedFile.name }],
    });

    const content = (created && created.content) || created || {};
    const documentId = content.id || content.documentId;
    if (!documentId) {
      throw ComunicadoService.mensagemApi(created) || "A API do GED não retornou o documentId.";
    }

    return {
      documentId: String(documentId),
      documentDescription: file.name,
      documentVersion: content.version || 1000,
      tipoConteudo: ComunicadoService.tipoPorArquivo(file),
    };
  }

  static fluigUrl(path) {
    const wcm = (top && top.WCMAPI) || (parent && parent.WCMAPI) || window.WCMAPI || {};
    const base = String(wcm.serverURL || "").replace(/\/$/, "");
    const suffix = path.charAt(0) === "/" ? path : "/" + path;
    return base ? base + suffix : suffix;
  }

  static ajaxForm(url, formData) {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: url,
        type: "POST",
        data: formData,
        cache: false,
        contentType: false,
        processData: false,
        xhrFields: { withCredentials: true },
        success: function (response) {
          if (typeof response === "string") {
            try {
              response = JSON.parse(response);
            } catch (e) {
              reject("Resposta inválida do upload GED.");
              return;
            }
          }
          resolve(response || {});
        },
        error: function (xhr, status, err) {
          reject(err || status || "Falha no upload temporário.");
        },
      });
    });
  }

  static ajaxJson(url, body, method) {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: url,
        type: method || "POST",
        data: JSON.stringify(body),
        contentType: "application/json;charset=utf-8",
        dataType: "text",
        xhrFields: { withCredentials: true },
        success: function (response) {
          if (!response) {
            resolve({ ok: true });
            return;
          }
          try {
            resolve(JSON.parse(response));
          } catch (e) {
            resolve({ ok: true, raw: response });
          }
        },
        error: function (xhr) {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({ ok: true });
            return;
          }
          let json = {};
          try {
            json = JSON.parse(xhr.responseText || "{}");
          } catch (e) {}
          reject(
            ComunicadoService.mensagemApi(json) ||
              json.code ||
              (xhr.responseText && String(xhr.responseText).replace(/<[^>]+>/g, " ").trim().slice(0, 280)) ||
              xhr.statusText ||
              "HTTP " + xhr.status
          );
        },
      });
    });
  }

  static ajaxGet(url) {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: url,
        type: "GET",
        dataType: "json",
        xhrFields: { withCredentials: true },
        success: function (response) {
          resolve(response || {});
        },
        error: function (xhr) {
          let json = {};
          try {
            json = JSON.parse(xhr.responseText || "{}");
          } catch (e) {}
          reject(ComunicadoService.mensagemApi(json) || xhr.statusText || "HTTP " + xhr.status);
        },
      });
    });
  }

  static mensagemApi(json) {
    if (!json || typeof json !== "object") {
      return "";
    }
    return (
      json.detailedMessage ||
      json.errorMessage ||
      (json.content && (json.content.detailedMessage || json.content.message)) ||
      json.message ||
      ""
    );
  }

  static erroTexto(erro) {
    if (erro == null) return "";
    if (typeof erro === "string") return erro;
    return String(erro.message || erro);
  }

  static tipoPorArquivo(file) {
    const type = (file.type || "").toLowerCase();
    const name = (file.name || "").toLowerCase();
    if (type === "image/gif" || name.endsWith(".gif")) return "gif";
    if (type.startsWith("image/")) return "imagem";
    if (type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
    if (type.startsWith("video/") || /\.(mp4|webm|ogg)$/.test(name)) return "video";
    return "pdf";
  }

  static tipoPorUrl(url) {
    if (!url) return "link";
    if (/youtu\.be|youtube\.com/i.test(url)) return "youtube";
    return "link";
  }

  static toYoutubeEmbed(url) {
    const match = String(url || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]+)/);
    if (match && match[1]) {
      return "https://www.youtube.com/embed/" + match[1];
    }
    return url || "";
  }

  static parseAnexos(bruto) {
    if (!bruto) return [];
    if (Array.isArray(bruto)) return bruto;
    if (typeof bruto === "object" && (bruto.documentId || bruto.documentUrl)) return [bruto];
    try {
      const json = JSON.parse(bruto);
      if (Array.isArray(json)) return json;
      if (json && (json.documentId || json.documentUrl)) return [json];
    } catch (eParse) {}
    return [];
  }

  static async urlDownloadGed(documentId) {
    if (!documentId) return "";
    try {
      const json = await ComunicadoService.ajaxGet(
        ComunicadoService.fluigUrl("/api/public/2.0/documents/getDownloadURL/" + encodeURIComponent(String(documentId)))
      );
      const url = json && (json.content || json.url || json.downloadURL);
      if (typeof url === "string" && url) return url;
      if (url && typeof url === "object") return url.url || url.content || "";
    } catch (eUrl) {
      console.warn("ComunicadoService.urlDownloadGed", eUrl);
    }
    return "";
  }

  static avisoPreview(record) {
    const status = String(ComunicadoService.campo(record, "STATUS") || "").toUpperCase();
    const popup = ComunicadoService.flagSN(ComunicadoService.campo(record, "EXIBIR_POPUP"));
    const partes = ["Preview administrativo: o botão não registra ciência."];
    if (status === ComunicadoConstants.STATUS.AGENDADO) {
      partes.push("O colaborador ainda não vê este comunicado (agendado).");
    }
    if (status === ComunicadoConstants.STATUS.EXPIRADO) {
      partes.push("Comunicado expirado: o colaborador não vê na Home.");
    }
    if (status === ComunicadoConstants.STATUS.CANCELADO) {
      partes.push("Comunicado cancelado: o colaborador não vê na Home.");
    }
    if (popup === "N") {
      partes.push("Popup desligado: o colaborador vê o conteúdo na Central de Tarefas.");
    }
    return partes.join(" ");
  }

  static async montarPreview(record) {
    var ficha = Object.assign({}, record || {});
    try {
      const dados = await ComunicadoService.resolverDadosFicha(record);
      const lida = await ComunicadoService.lerFicha(dados.cardId, dados.cardIndexId, dados.numero);
      ficha = ComunicadoService.mesclarFicha(ficha, lida);
    } catch (eFicha) {
      console.warn("ComunicadoService.montarPreview ficha", eFicha);
    }

    const anexos = ComunicadoService.parseAnexos(
      ComunicadoService.campo(ficha, "DOCUMENTOS_ANEXOS") || ComunicadoService.campo(ficha, "documentos_anexos")
    );
    const primeiro = anexos[0] || {};
    var documentUrl = primeiro.documentUrl || primeiro.documentURL || "";
    const documentId = primeiro.documentId || primeiro.documentID || "";
    if (!documentUrl && documentId) {
      documentUrl = await ComunicadoService.urlDownloadGed(documentId);
    }

    var tipo = String(
      ComunicadoService.campo(ficha, "TIPO_CONTEUDO") || ComunicadoService.campo(ficha, "tipo_conteudo") || "pdf"
    ).toLowerCase();
    const urlConteudo =
      ComunicadoService.campo(ficha, "URL_CONTEUDO") || ComunicadoService.campo(ficha, "url_conteudo") || "";
    const nome = primeiro.documentDescription || "";
    if ((!tipo || tipo === "pdf") && nome) {
      tipo = ComunicadoService.tipoPorArquivo({ name: nome, type: "" });
    }
    if ((!tipo || tipo === "pdf") && urlConteudo) {
      tipo = ComunicadoService.tipoPorUrl(urlConteudo);
    }

    const mesclado = Object.assign({}, record || {}, ficha);
    return {
      NUMERO_PROCESSO: String(
        ComunicadoService.campo(ficha, "NUMERO_PROCESSO") || (record && record.NUMERO_PROCESSO) || "preview"
      ),
      TITULO:
        ComunicadoService.campo(ficha, "TITULO") ||
        ComunicadoService.campo(ficha, "titulo") ||
        (record && record.TITULO) ||
        "Comunicado",
      DESCRICAO: ComunicadoService.campo(ficha, "DESCRICAO") || ComunicadoService.campo(ficha, "descricao") || "",
      TEXTO_BOTAO_ACAO:
        ComunicadoService.campo(ficha, "TEXTO_BOTAO_ACAO") ||
        ComunicadoService.campo(ficha, "texto_botao_acao") ||
        ComunicadoConstants.BOTAO_PADRAO,
      TIPO_CONTEUDO: tipo,
      URL_CONTEUDO: urlConteudo,
      DOCUMENT_URL: documentUrl,
      DOCUMENT_NAME: nome,
      DOCUMENT_ID: String(documentId || ""),
      EXIBIR_POPUP: ComunicadoService.flagSN(
        ComunicadoService.campo(ficha, "EXIBIR_POPUP") || (record && record.EXIBIR_POPUP)
      ),
      STATUS: String(ComunicadoService.campo(ficha, "STATUS") || (record && record.STATUS) || "").toUpperCase(),
      AVISO: ComunicadoService.avisoPreview(mesclado),
    };
  }

  static toCardValue(value) {
    if (value == null) return "";
    if (typeof value === "string") return value;
    return JSON.stringify(value);
  }

  static agoraCard() {
    const d = new Date();
    const p = function (n) {
      return ("0" + n).slice(-2);
    };
    return (
      d.getFullYear() +
      "-" +
      p(d.getMonth() + 1) +
      "-" +
      p(d.getDate()) +
      " " +
      p(d.getHours()) +
      ":" +
      p(d.getMinutes()) +
      ":" +
      p(d.getSeconds())
    );
  }

  static textoTitulo(valor) {
    const t = String(valor == null ? "" : valor).trim();
    if (!t || t === "null" || t === "undefined" || t === "NaN") return "";
    return t;
  }

  static descritorComunicado(titulo) {
    const t = ComunicadoService.textoTitulo(titulo);
    return t ? "Comunicado " + t : "Comunicado";
  }

  static descritorCiencia(titulo) {
    const t = ComunicadoService.textoTitulo(titulo);
    return t ? "Confirmar ciência " + t : "Confirmar ciência";
  }

  static montarFormFields(form, extra = {}) {
    const fields = {
      titulo: form.titulo || "",
      descricao: form.descricao || "",
      data_inicio: form.data_inicio || "",
      data_fim: form.sem_data_expiracao === "S" ? "" : form.data_fim || "",
      sem_data_expiracao: form.sem_data_expiracao === "S" ? "S" : "N",
      exibir_popup: form.exibir_popup === "S" ? "S" : "N",
      agendamento_futuro: form.agendamento_futuro === "S" ? "S" : "N",
      texto_botao_acao: form.texto_botao_acao || ComunicadoConstants.BOTAO_PADRAO,
      publico_tipo: form.publico_tipo || "todos",
      publico_grupos: ComunicadoService.toCardValue(form.publico_grupos || []),
      publico_usuarios: ComunicadoService.toCardValue(form.publico_usuarios || []),
      excecao_grupos: ComunicadoService.toCardValue(form.excecao_grupos || []),
      excecao_usuarios: ComunicadoService.toCardValue(form.excecao_usuarios || []),
      documentos_anexos: ComunicadoService.toCardValue(form.documentos_anexos || []),
      tipo_conteudo: form.tipo_conteudo || "pdf",
      url_conteudo: form.url_conteudo || "",
      status: form.status || "",
      cancelado: "N",
      excluido: "N",
      publicado: "N",
      usuarios_disparados: "[]",
      qtd_destinatarios: "0",
      campo_descritor: ComunicadoService.descritorComunicado(form.titulo),
      criado_por: extra.criado_por || (top.WCMAPI && top.WCMAPI.userCode) || "",
      criado_por_nome: extra.criado_por_nome || (top.WCMAPI && top.WCMAPI.user) || "",
      data_criacao: extra.data_criacao || form.data_criacao || form.DATA_CRIACAO || ComunicadoService.agoraCard(),
    };

    Object.keys(extra).forEach((key) => {
      if (fields[key] === undefined) {
        fields[key] = ComunicadoService.toCardValue(extra[key]);
      }
    });

    return fields;
  }
}
