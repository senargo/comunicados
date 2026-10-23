if (typeof SuperWidget === "undefined") {
  console.error("[ComunicadoHome] SuperWidget indefinido — a widget não inicia");
}

var ComunicadoHome = SuperWidget.extend({
  ATIVIDADE_CIENCIA: 5,
  ATIVIDADE_ARQUIVAR: 12,
  ADOBE_CLIENT_ID: "5d4181db4f854cd7a4d999cb0718782c",

  init: function () {
    this.instanceId = this.instanceId || this.id || "";
    this.queue = [];
    this.fichaCache = {};
    this.ignorados = this.lerIgnorados();
    this.busy = false;
    this.modalAtual = null;
    this.itemAtual = null;
    this._loadTentativa = 0;
    console.log("[ComunicadoHome] init instance=" + this.instanceId);
    this.loadComunicados();
  },

  loadComunicados: function () {
    var self = this;
    var user = this.usuario();
    console.log("[ComunicadoHome] usuario", user.code || "(vazio)");
    if (!user.code) {
      console.warn("[ComunicadoHome] sem usuário logado");
      if (this._loadTentativa < 4) {
        this._loadTentativa++;
        setTimeout(function () {
          self.loadComunicados();
        }, 700);
      }
      return;
    }

    this.ignorados = this.lerIgnorados();
    this.listarCiencias(user.code)
      .then(function (items) {
        if (items && items[0] && items[0].ERRO) {
          throw items[0].ERRO;
        }
        var lista = items || [];
        var pendentes = lista.filter(function (el) {
          return self.cienciaPendente(el, user);
        });
        console.log("[ComunicadoHome] ds=" + lista.length + " pendentes=" + pendentes.length + " user=" + user.code);
        if (lista[0]) {
          console.log("[ComunicadoHome] ds[0] keys", Object.keys(lista[0]));
        }
        return self.montarFila(pendentes);
      })
      .then(function (fila) {
        self.queue = fila;
        console.log("[ComunicadoHome] fila=" + fila.length);
        self.showNextPopup();
      })
      .catch(function (err) {
        console.error("[ComunicadoHome] erro", err);
      });
  },

  listarCiencias: function (userCode) {
    var self = this;
    return new Promise(function (resolve, reject) {
      try {
        var Factory =
          window.DatasetFactory ||
          (window.parent && window.parent.DatasetFactory) ||
          (window.top && window.top.DatasetFactory);
        var Type =
          window.ConstraintType ||
          (window.parent && window.parent.ConstraintType) ||
          (window.top && window.top.ConstraintType);
        if (Factory && Type && typeof Factory.getDataset === "function") {
          var ds = Factory.getDataset(
            "dsComunicadosListar",
            null,
            [Factory.createConstraint("user_code", userCode, userCode, Type.MUST)],
            null
          );
          if (ds && ds.values && ds.values.length) {
            resolve(ds.values);
            return;
          }
        }
      } catch (eFactory) {
        console.warn("[ComunicadoHome] DatasetFactory", eFactory);
      }
      self.callDataset("dsComunicadosListar", { user_code: userCode }).then(resolve).catch(reject);
    });
  },

  montarFila: function (pendentes) {
    var self = this;
    var pais = [];
    (pendentes || []).forEach(function (el) {
      var pai = self.campo(el, "NUMERO_PROCESSO_PAI");
      if (pai && pais.indexOf(pai) === -1) pais.push(pai);
    });
    return this.carregarFichas(pais)
      .then(function () {
        return self.completarItens(pendentes);
      })
      .then(function (completos) {
        var vistos = {};
        var fila = [];
        (completos || []).forEach(function (item) {
          var numero = String((item && item.NUMERO_PROCESSO) || "");
          if (!numero || vistos[numero] || self.foiIgnorado(numero)) return;
          if (!self.deveExibirPopup(item)) {
            console.log("[ComunicadoHome] fora da fila ativo", numero, item.STATUS, item.DATA_FIM);
            return;
          }
          vistos[numero] = true;
          fila.push(item);
        });
        return fila;
      });
  },

  cienciaPendente: function (el, user) {
    if (this.campo(el, "DATA_CIENCIA") || String(this.campo(el, "RESULTADO") || "").toLowerCase() === "aprovado") {
      return false;
    }
    var destinatario = this.campo(el, "USUARIO_MATRICULA") || this.campo(el, "USER_CODE");
    if (destinatario && String(destinatario) !== String(user.code)) {
      return false;
    }
    if (!this.campo(el, "NUMERO_PROCESSO_PAI")) {
      return false;
    }
    if (this.cienciaEncerrada(el)) {
      return false;
    }
    var estado = this.campo(el, "NUM_SEQ_ESTADO");
    if (estado && String(estado) !== String(this.ATIVIDADE_CIENCIA) && String(estado) !== "5") {
      return false;
    }
    var numero = this.campo(el, "NUMERO_PROCESSO");
    if (!numero || this.foiIgnorado(numero)) {
      return false;
    }
    return true;
  },

  cienciaEncerrada: function (el) {
    var desc = String(this.campo(el, "DESCRICAO_STATUS") || "").toUpperCase();
    if (desc === "CANCELADO" || desc === "FINALIZADO") return true;
    var status = String(this.campo(el, "STATUS") || this.campo(el, "CLOSURE_STATUS") || "");
    if (status === "1" || status === "2") return true;
    return false;
  },

  carregarFichas: function (numeros) {
    var self = this;
    var cadeia = Promise.resolve();
    (numeros || []).forEach(function (numero) {
      cadeia = cadeia.then(function () {
        return self.lerFicha(numero).then(function (mapa) {
          self.fichaCache[String(numero)] = mapa || {};
        });
      });
    });
    return cadeia;
  },

  completarItens: function (pendentes) {
    var self = this;
    var cadeia = Promise.resolve();
    var saida = [];
    (pendentes || []).forEach(function (el) {
      cadeia = cadeia.then(function () {
        var pai = self.campo(el, "NUMERO_PROCESSO_PAI");
        var mestre = (pai && self.fichaCache[String(pai)]) || {};
        return self.lerFicha(self.campo(el, "NUMERO_PROCESSO")).then(function (ciencia) {
          saida.push(self.montarItem(el, mestre, ciencia || {}));
        });
      });
    });
    return cadeia.then(function () {
      return saida;
    });
  },

  montarItem: function (el, mestre, ciencia) {
    var anexos = this.parseAnexos(this.campo(el, "DOCUMENTOS_ANEXOS") || ciencia.documentos_anexos || mestre.documentos_anexos);
    var primeiro = anexos[0] || {};
    return {
      NUMERO_PROCESSO: this.campo(el, "NUMERO_PROCESSO"),
      NUMERO_PROCESSO_PAI: this.campo(el, "NUMERO_PROCESSO_PAI"),
      TITULO: mestre.titulo || mestre.TITULO || this.campo(el, "ASSUNTO") || this.campo(el, "CAMPO_DESCRITOR") || "Comunicado",
      DESCRICAO: mestre.descricao || this.campo(el, "OBSERVACAO") || "",
      TEXTO_BOTAO_ACAO: ciencia.texto_botao_acao || mestre.texto_botao_acao || "Ciente",
      TIPO_CONTEUDO: String(ciencia.tipo_conteudo || mestre.tipo_conteudo || "pdf").toLowerCase(),
      URL_CONTEUDO: ciencia.url_conteudo || mestre.url_conteudo || "",
      DOCUMENT_URL: primeiro.documentUrl || "",
      DOCUMENT_ID: primeiro.documentId || "",
      DOCUMENT_VERSION: primeiro.documentVersion || primeiro.version || "",
      DOCUMENT_NAME: primeiro.documentDescription || "",
      EXIBIR_POPUP: this.flagSN(
        this.campo(ciencia, "exibir_popup") || this.campo(mestre, "exibir_popup") || this.campo(el, "EXIBIR_POPUP")
      ),
      STATUS: String(this.campo(mestre, "status") || this.campo(el, "STATUS") || "").toUpperCase(),
      DESCRICAO_STATUS: String(this.campo(el, "DESCRICAO_STATUS") || "").toUpperCase(),
      CANCELADO: this.flagSN(mestre.cancelado || mestre.CANCELADO),
      EXCLUIDO: this.flagSN(mestre.excluido || mestre.EXCLUIDO),
      DATA_INICIO: mestre.data_inicio || mestre.DATA_INICIO || "",
      DATA_FIM: mestre.data_fim || mestre.DATA_FIM || "",
      SEM_DATA_EXPIRACAO: this.flagSN(mestre.sem_data_expiracao || mestre.SEM_DATA_EXPIRACAO),
    };
  },

  deveExibirPopup: function (item) {
    if (!item || item.EXCLUIDO === "S" || item.CANCELADO === "S") return false;
    if (this.foiIgnorado(item.NUMERO_PROCESSO)) return false;
    if (item.EXIBIR_POPUP === "N") return false;
    if (item.DESCRICAO_STATUS === "CANCELADO" || item.DESCRICAO_STATUS === "FINALIZADO") return false;
    var status = String(item.STATUS || "").toUpperCase();
    if (status === "1" || status === "2" || status === "CANCELADO" || status === "EXPIRADO" || status === "AGENDADO") {
      return false;
    }
    var hoje = this.hojeIso();
    var inicio = this.isoDate(item.DATA_INICIO);
    var fim = this.isoDate(item.DATA_FIM);
    if (inicio && inicio > hoje) return false;
    if (item.SEM_DATA_EXPIRACAO === "S") return true;
    if (fim) return fim >= hoje;
    return status === "ATIVO";
  },

  docPortal: function () {
    try {
      if (window.top && window.top.document && window.top.document.body) {
        return window.top.document;
      }
    } catch (e) {}
    return document;
  },

  $portal: function () {
    return $(this.docPortal().body);
  },

  showNextPopup: function () {
    var item = null;
    while (this.queue && this.queue.length) {
      item = this.queue.shift();
      if (item && this.deveExibirPopup(item)) break;
      if (item) {
        console.log("[ComunicadoHome] pulando inativo", item.NUMERO_PROCESSO, item.STATUS, item.DATA_FIM);
      }
      item = null;
    }
    if (!item) {
      this.modalAtual = null;
      this.itemAtual = null;
      return;
    }

    var self = this;
    this.itemAtual = item;
    console.log("[ComunicadoHome] popup processo=" + item.NUMERO_PROCESSO);
    this.abrirOverlay(item);
    this.garantirUrlAnexo(item)
      .then(function () {
        self.pintarMidia(item, 0);
      })
      .catch(function () {
        self.pintarMidia(item, 0);
      });
  },

  abrirOverlay: function (item) {
    var self = this;
    var $body = this.$portal();
    this.fecharOverlay();
    var botao = "Abrir Documento";
    var id = "modalComunicadoHome_" + item.NUMERO_PROCESSO;
    this.garantirCssPortal();
    $body.append(
      '<div id="comHomeBackdrop" class="com-home-backdrop modal-backdrop in"></div>'
    );
    $body.append(
      '<div id="' +
        id +
        '" class="fluig-style-guide modal in com-home-modal" tabindex="-1" role="dialog" aria-modal="true" style="display:flex;">' +
        '<div class="modal-dialog modal-lg" role="document">' +
        '<div class="modal-content">' +
        '<div class="modal-header">' +
        '<h4 class="modal-title">' +
        this.escapeHtml(item.TITULO || "Comunicado") +
        "</h4></div>" +
        '<div class="modal-body">' +
        this.buildCard(item, true) +
        "</div>" +
        '<div class="modal-footer">' +
        '<button type="button" class="btn btn-default" data-com-fechar style="display:none;margin-right:8px;">Fechar</button>' +
        '<button type="button" class="btn btn-success" data-com-abrir>' +
        this.escapeHtml(botao) +
        "</button>" +
        "</div></div></div></div>"
    );
    $body.addClass("com-home-modal-open");
    $body.find("[data-com-abrir]").off("click.comhome").on("click.comhome", function () {
      self.abrirDocumentoDoPopup(item);
    });
    $body.find("[data-com-fechar]").off("click.comhome").on("click.comhome", function () {
      self.pularPopup(item);
    });
    this.modalAtual = {
      remove: function () {
        self.fecharOverlay();
      },
    };
    console.log("[ComunicadoHome] overlay no body visivel=" + !!this.docPortal().getElementById(id));
  },

  garantirCssPortal: function () {
    var doc = this.docPortal();
    var versao = "20261021h";
    var atual = doc.getElementById("comHomeOverlayCss");
    if (atual && atual.getAttribute("data-com-home-css") === versao) return;
    if (atual && atual.parentNode) atual.parentNode.removeChild(atual);
    var css =
      ".com-home-backdrop.modal-backdrop,.com-home-backdrop{position:fixed!important;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,.5);z-index:1000000!important}" +
      ".com-home-modal.modal{position:fixed!important;top:0!important;right:0!important;bottom:0!important;left:0!important;z-index:1000001!important;display:flex!important;align-items:center;justify-content:center;padding:40px 16px;overflow:auto;transform:none!important}" +
      ".com-home-modal .modal-dialog{width:90%!important;max-width:980px;margin:0 auto!important;top:auto!important;transform:none!important}" +
      ".com-home-modal .modal-content{background:#fff;border:1px solid rgba(0,0,0,.2);border-radius:6px;box-shadow:0 5px 15px rgba(0,0,0,.5);outline:0;display:flex;flex-direction:column;max-height:calc(100vh - 80px);overflow:hidden}" +
      ".com-home-modal .modal-header{padding:15px;border-bottom:1px solid #e5e5e5;flex:0 0 auto}" +
      ".com-home-modal .modal-title{margin:0;font-size:18px;font-weight:500;line-height:1.42857143}" +
      ".com-home-modal .modal-body{padding:15px;overflow:auto;flex:1 1 auto;min-height:0}" +
      ".com-home-modal .modal-footer{padding:15px;text-align:center;border-top:1px solid #e5e5e5;background:#fff;flex:0 0 auto}" +
      ".com-home-modal .modal-footer .btn{display:inline-block;padding:6px 12px;margin:0 4px;font-size:14px;line-height:1.42857143;border:1px solid transparent;border-radius:4px;cursor:pointer}" +
      ".com-home-modal .modal-footer .btn-success{color:#fff;background-color:#5cb85c;border-color:#4cae4c}" +
      ".com-home-modal .modal-footer .btn-default{color:#333;background-color:#fff;border-color:#ccc}" +
      ".com-home-modal .close,.com-home-modal [data-dismiss=modal]{display:none!important}" +
      ".com-preview-descricao{white-space:pre-wrap;margin:0 0 12px}" +
      ".com-preview-media{margin:12px 0 0;width:100%}" +
      ".com-preview-media .com-adobe-view{width:100%;height:480px;min-height:420px}" +
      ".com-preview-media img{max-width:100%;height:auto;border:0}" +
      ".com-preview-media video{width:100%;max-height:480px;border:0}" +
      ".com-preview-media iframe{width:100%;min-height:360px;border:0}" +
      "body.com-home-modal-open{overflow:hidden}" +
      ".com-home-ecm-acoes{display:flex;justify-content:center;align-items:center;gap:12px;padding:16px 20px;background:#fff;border-top:1px solid #e5e5e5;flex:0 0 auto;z-index:1000002}" +
      ".com-home-ecm-acoes .btn{display:inline-block;padding:6px 12px;font-size:14px;line-height:1.42857143;border:1px solid transparent;border-radius:4px;cursor:pointer}" +
      ".com-home-ecm-acoes .btn-success{color:#fff;background-color:#5cb85c;border-color:#4cae4c}" +
      ".com-home-ecm-acoes .btn-default{color:#333;background-color:#fff;border-color:#ccc}" +
      ".com-home-ecm-acoes-avulsa{position:fixed!important;left:0;right:0;bottom:0;z-index:2147483000!important;box-shadow:0 -4px 16px rgba(0,0,0,.18)}";
    var style = doc.createElement("style");
    style.id = "comHomeOverlayCss";
    style.setAttribute("data-com-home-css", versao);
    style.type = "text/css";
    style.appendChild(doc.createTextNode(css));
    (doc.head || doc.body).appendChild(style);
  },

  fecharOverlay: function () {
    var $body = this.$portal();
    $body.find("#comHomeBackdrop, [id^='modalComunicadoHome_']").remove();
    $body.removeClass("com-home-modal-open");
  },

  mostrarFechar: function () {
    this.$portal().find("[data-com-fechar]").show();
  },

  pularPopup: function (item) {
    var alvo = item || this.itemAtual;
    var numero = String((alvo && alvo.NUMERO_PROCESSO) || "");
    this.marcarIgnorado(numero);
    this.queue = (this.queue || []).filter(function (el) {
      return String(el.NUMERO_PROCESSO || "") !== numero;
    });
    this.busy = false;
    this.fecharOverlay();
    this.modalAtual = null;
    this.itemAtual = null;
    this.showNextPopup();
  },

  chaveIgnorados: function () {
    var user = this.usuario && this.usuario();
    return "comHomeIgnorados:" + String((user && user.code) || "");
  },

  lerIgnorados: function () {
    try {
      var bruto = window.sessionStorage && sessionStorage.getItem(this.chaveIgnorados());
      var lista = bruto ? JSON.parse(bruto) : [];
      var mapa = {};
      (lista || []).forEach(function (n) {
        if (n) mapa[String(n)] = true;
      });
      return mapa;
    } catch (e) {
      return {};
    }
  },

  foiIgnorado: function (numero) {
    return !!(this.ignorados && this.ignorados[String(numero || "")]);
  },

  marcarIgnorado: function (numero) {
    var chave = String(numero || "");
    if (!chave) return;
    this.ignorados = this.ignorados || {};
    this.ignorados[chave] = true;
    try {
      if (window.sessionStorage) {
        sessionStorage.setItem(this.chaveIgnorados(), JSON.stringify(Object.keys(this.ignorados)));
      }
    } catch (e) {}
  },

  exibirModalNoPortal: function (numero) {
    this.abrirOverlay(this.itemAtual || { NUMERO_PROCESSO: numero, TITULO: "Comunicado" });
  },

  travarModal: function () {},

  buildCard: function (item, isPopup) {
    var titulo = item.TITULO || item.ASSUNTO || "";
    var descricao = item.DESCRICAO || item.OBSERVACAO || "";
    var numero = item.NUMERO_PROCESSO || "";
    var blocoDescricao = descricao
      ? '<p class="com-preview-descricao">' + this.escapeHtml(descricao) + "</p>"
      : "";
    if (isPopup) {
      return (
        '<div class="fluig-style-guide com-preview">' +
        blocoDescricao +
        '<div class="com-preview-media">' +
        '<div id="com-adobe-' +
        numero +
        '" class="com-adobe-view" style="display:none;"></div>' +
        '<div id="com-media-alt-' +
        numero +
        '" class="com-media-alt"></div>' +
        "</div></div>"
      );
    }
    return (
      '<div class="com-home-card">' +
      "<h4>" +
      this.escapeHtml(titulo) +
      "</h4>" +
      blocoDescricao +
      '<div class="com-preview-media">' +
      '<div id="com-adobe-' +
      numero +
      '" class="com-adobe-view" style="display:none;"></div>' +
      '<div id="com-media-alt-' +
      numero +
      '" class="com-media-alt"></div>' +
      "</div></div>"
    );
  },

  resolverTipo: function (item) {
    var tipo = String((item && item.TIPO_CONTEUDO) || "pdf").toLowerCase();
    if ((!tipo || tipo === "pdf") && item && item.DOCUMENT_NAME) {
      tipo = this.inferTipoPorNome(item.DOCUMENT_NAME);
    }
    if ((!tipo || tipo === "pdf") && item && item.URL_CONTEUDO) {
      tipo = this.inferTipoPorUrl(item.URL_CONTEUDO);
    }
    return tipo || "pdf";
  },

  pintarMidia: function (item, tentativa) {
    if (!item) return;
    var numero = item.NUMERO_PROCESSO;
    var $p = this.$portal();
    if (!$p.find("#com-adobe-" + numero).length && !$p.find("#com-media-alt-" + numero).length) {
      return;
    }
    var tipo = this.resolverTipo(item);
    var urlAnexo = item.DOCUMENT_URL || "";
    var urlExterna = item.URL_CONTEUDO || "";
    var adobe = $p.find("#com-adobe-" + numero);
    var alt = $p.find("#com-media-alt-" + numero);

    if (tipo === "pdf" && urlAnexo) {
      alt.empty();
      adobe.show();
      this.exibirPdfAdobe(item, tentativa || 0);
      return;
    }

    adobe.hide().empty();
    alt.html(
      this.htmlMidiaAlternativa(tipo, urlAnexo, urlExterna) ||
        '<p class="text-muted">Nenhum conteúdo para exibir.</p>'
    );
  },

  exibirPdfAdobe: function (item, tentativa) {
    var self = this;
    var divId = "com-adobe-" + item.NUMERO_PROCESSO;
    if (!this.$portal().find("#" + divId).length) {
      return;
    }
    this.garantirAdobeSdk().then(function () {
      if (!self.$portal().find("#" + divId).length) {
        return;
      }
      if (typeof AdobeDC === "undefined" || !AdobeDC.View) {
        if (tentativa < 8) {
          setTimeout(function () {
            self.exibirPdfAdobe(item, tentativa + 1);
          }, 400);
          return;
        }
        self.fallbackPdf(item);
        return;
      }
      try {
        var view = new AdobeDC.View({
          clientId: self.ADOBE_CLIENT_ID,
          divId: divId,
        });
        view.previewFile(
          {
            content: { location: { url: item.DOCUMENT_URL } },
            metaData: { fileName: item.DOCUMENT_NAME || "documento.pdf" },
          },
          {
            embedMode: "SIZED_CONTAINER",
            defaultViewMode: "FIT_WIDTH",
            showAnnotationTools: false,
            showDownloadPDF: false,
            showPrintPDF: false,
            showFullScreen: false,
            enableFormFilling: false,
            showThumbnails: false,
            showBookmarks: false,
            showZoomControl: false,
            dockPageControls: true,
            enableSaveApi: false,
          }
        );
      } catch (e) {
        console.warn("wid_comunicado_home adobe", e);
        if (tentativa < 8) {
          setTimeout(function () {
            self.exibirPdfAdobe(item, tentativa + 1);
          }, 400);
          return;
        }
        self.fallbackPdf(item);
      }
    });
  },

  fallbackPdf: function (item) {
    var numero = item.NUMERO_PROCESSO;
    this.$portal().find("#com-adobe-" + numero).hide().empty();
    this.$portal().find("#com-media-alt-" + numero).html(
      '<a class="btn btn-primary" href="' +
        this.escapeHtml(item.DOCUMENT_URL) +
        '" target="_blank" rel="noopener">Abrir PDF</a>'
    );
  },

  garantirAdobeSdk: function () {
    if (window.AdobeDC) {
      return Promise.resolve();
    }
    if (this._adobeSdk) {
      return this._adobeSdk;
    }
    var self = this;
    this._adobeSdk = new Promise(function (resolve) {
      var feito = false;
      var terminar = function () {
        if (feito) return;
        feito = true;
        resolve();
      };
      document.addEventListener("adobe_dc_view_sdk.ready", terminar);
      if (!document.getElementById("adobe-view-sdk-home")) {
        var script = document.createElement("script");
        script.id = "adobe-view-sdk-home";
        script.src = "https://acrobatservices.adobe.com/view-sdk/viewer.js";
        script.onload = function () {
          if (window.AdobeDC) terminar();
        };
        script.onerror = terminar;
        document.head.appendChild(script);
      } else if (window.AdobeDC) {
        terminar();
      }
      setTimeout(terminar, 3500);
    }).then(function () {
      if (!window.AdobeDC) {
        self._adobeSdk = null;
      }
    });
    return this._adobeSdk;
  },

  htmlMidiaAlternativa: function (tipo, urlAnexo, urlExterna) {
    if ((tipo === "imagem" || tipo === "gif") && urlAnexo) {
      return '<img src="' + this.escapeHtml(urlAnexo) + '" alt="Comunicado">';
    }
    if (tipo === "video" && urlAnexo) {
      return '<video src="' + this.escapeHtml(urlAnexo) + '" controls></video>';
    }
    if (tipo === "youtube" && urlExterna) {
      return (
        '<iframe src="' +
        this.escapeHtml(this.toYoutubeEmbed(urlExterna)) +
        '" allowfullscreen></iframe>'
      );
    }
    if (tipo === "link" && urlExterna) {
      return (
        '<a class="btn btn-primary" href="' +
        this.escapeHtml(urlExterna) +
        '" target="_blank" rel="noopener">Abrir conteúdo</a>'
      );
    }
    if (urlAnexo) {
      return (
        '<a class="btn btn-primary" href="' +
        this.escapeHtml(urlAnexo) +
        '" target="_blank" rel="noopener">Abrir anexo</a>'
      );
    }
    if (urlExterna) {
      return (
        '<a class="btn btn-primary" href="' +
        this.escapeHtml(urlExterna) +
        '" target="_blank" rel="noopener">Abrir conteúdo</a>'
      );
    }
    return "";
  },

  inferTipoPorNome: function (nome) {
    var n = String(nome || "").toLowerCase();
    if (n.indexOf(".gif") !== -1) return "gif";
    if (/\.(png|jpe?g|webp|bmp)$/.test(n)) return "imagem";
    if (/\.(mp4|webm|ogg)$/.test(n)) return "video";
    if (n.indexOf(".pdf") !== -1) return "pdf";
    return "pdf";
  },

  inferTipoPorUrl: function (url) {
    if (/youtu\.be|youtube\.com/i.test(url || "")) return "youtube";
    if (url) return "link";
    return "pdf";
  },

  toYoutubeEmbed: function (url) {
    var match = String(url || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]+)/);
    if (match && match[1]) {
      return "https://www.youtube.com/embed/" + match[1];
    }
    return url || "";
  },

  janelaPortal: function () {
    try {
      if (window.top && window.top.WCMC) return window.top;
    } catch (eTop) {}
    try {
      if (window.parent && window.parent.WCMC) return window.parent;
    } catch (eParent) {}
    return window;
  },

  abrirDocumentoDoPopup: function (item) {
    if (!item || !item.DOCUMENT_ID) {
      if (typeof FLUIGC !== "undefined" && FLUIGC.toast) {
        FLUIGC.toast({
          title: "Comunicado",
          message: "Este comunicado não tem documento na GED.",
          type: "warning",
        });
      }
      this.mostrarFechar();
      return;
    }
    this.itemAtual = item;
    this.fecharOverlay();
    this.abrirDocumentoEcm(item);
  },

  abrirDocumentoEcm: function (item) {
    var self = this;
    var docId = item && item.DOCUMENT_ID;
    if (!docId) {
      console.log("[ComunicadoHome] sem DOCUMENT_ID para o painel ECM");
      return;
    }
    var titulo = (item && item.TITULO) || "Visualizador de Documentos";
    var versao = item.DOCUMENT_VERSION || undefined;
    var win = this.janelaPortal();
    var wcm = win.WCMAPI || window.WCMAPI || {};
    var mobile = false;
    try {
      mobile = (typeof wcm.isMobileAppMode === "function" && wcm.isMobileAppMode()) || window.innerWidth <= 400;
    } catch (eMob) {}
    if (mobile) {
      this.abrirDocumentoAba(win, wcm, docId);
      this.mostrarBarraCienciaAvulsa(item);
      return;
    }
    try {
      if (win.WCMC && typeof win.WCMC.panel === "function") {
        if (!win.ECM) win.ECM = {};
        if (!win.ECM.documentView) win.ECM.documentView = {};
        this.painelEcm = win.ECM.documentView.panel = win.WCMC.panel({
          url: "/ecm_documentview/documentView.ftl",
          maximized: true,
          title: titulo,
          callBack: function () {
            try {
              if (win.ECM && win.ECM.documentView && typeof win.ECM.documentView.getDocument === "function") {
                if (versao) {
                  win.ECM.documentView.getDocument(docId, versao);
                } else {
                  win.ECM.documentView.getDocument(docId);
                }
              }
            } catch (eDoc) {
              console.warn("[ComunicadoHome] ECM.documentView", eDoc);
            }
            self.agendarBarraEcm(item);
          },
          customButtons: [
            {
              label: "Agora Não",
              action: function () {
                self.agoraNao(item);
              },
            },
            {
              label: "Li e estou ciente",
              action: function () {
                self.confirmar(item);
              },
            },
          ],
        });
        this.mostrarBarraCienciaAvulsa(item);
        this.agendarBarraEcm(item);
        return;
      }
    } catch (ePanel) {
      console.warn("[ComunicadoHome] WCMC.panel", ePanel);
    }
    this.abrirDocumentoAba(win, wcm, docId);
    this.mostrarBarraCienciaAvulsa(item);
  },

  documentosAcessiveis: function () {
    var docs = [];
    var raiz = this.docPortal();
    if (raiz) docs.push(raiz);
    try {
      var iframes = raiz.querySelectorAll("iframe");
      for (var i = 0; i < iframes.length; i++) {
        try {
          var idoc =
            iframes[i].contentDocument ||
            (iframes[i].contentWindow && iframes[i].contentWindow.document);
          if (idoc) docs.push(idoc);
        } catch (eFrame) {}
      }
    } catch (eQuery) {}
    return docs;
  },

  esconderBotaoFecharEcm: function () {
    var docs = this.documentosAcessiveis();
    for (var d = 0; d < docs.length; d++) {
      var els = docs[d].querySelectorAll(
        ".wcm-panel button, .wcm-simple-panel button, .wcm-panel-footer button, .wcm-panel .btn, #ecm-documentview-main button"
      );
      for (var i = 0; i < els.length; i++) {
        var t = String(els[i].textContent || els[i].value || "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();
        if (t === "fechar" || t === "close") {
          els[i].style.setProperty("display", "none", "important");
        }
      }
    }
  },

  agendarBarraEcm: function (item) {
    var self = this;
    var tentativas = 0;
    var tentar = function () {
      self.esconderBotaoFecharEcm();
      self.ligarBotoesEcm(item);
      if (self.injetarBarraEcm(item) || tentativas > 15) return;
      tentativas += 1;
      setTimeout(tentar, 400);
    };
    setTimeout(tentar, 250);
  },

  htmlBarraCiencia: function () {
    return (
      '<button type="button" class="btn btn-default" data-com-ciencia-nao>Agora Não</button>' +
      '<button type="button" class="btn btn-success" data-com-ciencia-sim>Li e estou ciente</button>'
    );
  },

  injetarBarraEcm: function (item) {
    if (this.docPortal().getElementById("comHomeEcmAcoes")) {
      this.ligarBotoesEcm(item);
      return true;
    }
    var docs = this.documentosAcessiveis();
    for (var d = 0; d < docs.length; d++) {
      var doc = docs[d];
      if (doc.getElementById("comHomeEcmAcoes")) {
        this.ligarBotoesEcm(item);
        return true;
      }
      var principal = doc.getElementById("ecm-documentview-main");
      var alvo =
        principal ||
        doc.querySelector(".wcm-panel .wcm-panel-content, .wcm-panel-body, .wcm-panel-footer, .wcm-panel");
      if (!alvo) continue;
      var barra = doc.createElement("div");
      barra.id = "comHomeEcmAcoes";
      barra.className = "fluig-style-guide com-home-ecm-acoes";
      barra.innerHTML = this.htmlBarraCiencia();
      if (principal && principal.parentNode) {
        principal.parentNode.insertBefore(barra, principal.nextSibling);
      } else {
        alvo.appendChild(barra);
      }
      this.ligarBotoesEcm(item);
      return true;
    }
    return false;
  },

  mostrarBarraCienciaAvulsa: function (item) {
    var doc = this.docPortal();
    this.removerBarraEcm();
    var barra = doc.createElement("div");
    barra.id = "comHomeEcmAcoes";
    barra.className = "fluig-style-guide com-home-ecm-acoes com-home-ecm-acoes-avulsa";
    barra.innerHTML = this.htmlBarraCiencia();
    (doc.body || doc.documentElement).appendChild(barra);
    this.ligarBotoesEcm(item);
  },

  ligarBotoesEcm: function (item) {
    var self = this;
    var docs = this.documentosAcessiveis();
    for (var d = 0; d < docs.length; d++) {
      var $doc = $(docs[d]);
      $doc.find("[data-com-ciencia-nao]").off("click.comciencia").on("click.comciencia", function () {
        self.agoraNao(item);
      });
      $doc.find("[data-com-ciencia-sim]").off("click.comciencia").on("click.comciencia", function () {
        self.confirmar(item);
      });
    }
  },

  removerBarraEcm: function () {
    var docs = this.documentosAcessiveis();
    for (var d = 0; d < docs.length; d++) {
      var barra = docs[d].getElementById("comHomeEcmAcoes");
      if (barra && barra.parentNode) barra.parentNode.removeChild(barra);
    }
  },

  fecharPainelEcm: function () {
    var win = this.janelaPortal();
    var painel = this.painelEcm;
    try {
      if (!painel && win.ECM && win.ECM.documentView) {
        painel = win.ECM.documentView.panel;
      }
    } catch (ePainel) {}
    try {
      if (painel && typeof painel.close === "function") {
        painel.close();
      } else if (painel && typeof painel.hide === "function") {
        painel.hide();
      }
    } catch (eClose) {}
    this.removerBarraEcm();
    try {
      var doc = this.docPortal();
      var fechar = doc.querySelector(
        ".wcm-panel .close, .wcm-panel [data-dismiss], .wcm-panel .fluigicon-remove, .wcm-panel-header .close"
      );
      if (fechar && doc.getElementById("ecm-documentview-main")) {
        fechar.click();
      }
    } catch (eClick) {}
    this.painelEcm = null;
  },

  agoraNao: function (item) {
    if (this._fechandoEcm) return;
    this._fechandoEcm = true;
    this.fecharPainelEcm();
    this.fecharOverlay();
    this.busy = false;
    this.modalAtual = null;
    this.itemAtual = null;
    this._fechandoEcm = false;
    this.showNextPopup();
  },

  abrirDocumentoAba: function (win, wcm, docId) {
    var api = wcm || {};
    var server = "";
    var ctx = "";
    var tenant = "Faeg";
    try {
      server = (api.getServerURL && api.getServerURL()) || api.serverURL || "";
      ctx = (api.getProtectedContextPath && api.getProtectedContextPath()) || "";
      tenant = (api.getTenantCode && api.getTenantCode()) || api.tenantCode || "Faeg";
    } catch (eUrl) {}
    var url =
      server + ctx + "/" + tenant + "/ecmnavigation?app_ecm_navigation_doc=" + encodeURIComponent(String(docId));
    (win || window).open(url, "_blank");
  },

  confirmar: function (item) {
    var self = this;
    if (this.busy) return;
    this.busy = true;
    this.marcarBotao(true);

    this.moverCiencia(item)
      .then(function () {
        self.fecharPainelEcm();
        self.fecharOverlay();
        if (typeof FLUIGC !== "undefined" && FLUIGC.toast) {
          FLUIGC.toast({ title: "Ciência", message: "Ciência registrada.", type: "success" });
        }
        self.busy = false;
        self.modalAtual = null;
        self.itemAtual = null;
        setTimeout(function () {
          self.showNextPopup();
        }, 350);
      })
      .catch(function (err) {
        self.busy = false;
        var texto = self.erroTexto(err) || "Não foi possível registrar a ciência. Tente de novo.";
        console.error("wid_comunicado_home confirmar", err);
        if (typeof FLUIGC !== "undefined" && FLUIGC.toast) {
          FLUIGC.toast({
            title: "Ciência",
            message: texto,
            type: self.cienciaIndisponivel(texto) ? "warning" : "danger",
          });
        }
        if (self.cienciaIndisponivel(texto)) {
          self.fecharPainelEcm();
          self.pularPopup(item);
          return;
        }
        self.marcarBotao(false);
      });
  },

  cienciaIndisponivel: function (err) {
    var texto = String(err || "").toLowerCase();
    return /cancelad|finalizad|devidamente ativa|não está na atividade|nao está na atividade|não achei a tarefa|nao achei a tarefa|arquivad/.test(
      texto
    );
  },

  marcarBotao: function (ocupado) {
    var $p = this.$portal();
    $p.find("[data-com-abrir], [data-com-ciencia-sim], [data-com-ciencia-nao]").prop("disabled", !!ocupado);
    var sim = $p.find("[data-com-ciencia-sim]");
    if (ocupado) {
      sim.data("label-original", sim.text());
      sim.text("Registrando...");
    } else if (sim.data("label-original")) {
      sim.text(sim.data("label-original"));
    }
  },

  moverCiencia: function (item) {
    var self = this;
    var user = this.usuario();
    var numero = item.NUMERO_PROCESSO;
    return this.atividadeAberta(numero).then(function (tarefa) {
      if (!tarefa || !tarefa.movementSequence) {
        throw "Não achei a tarefa aberta da ciência " + numero + ".";
      }
      if (tarefa.stateSequence && String(tarefa.stateSequence) !== String(self.ATIVIDADE_CIENCIA)) {
        throw "A ciência " + numero + " não está na atividade de confirmação.";
      }
      var formFields = {
        resultado: "aprovado",
        data_ciencia: self.agora(),
        usuario_matricula: user.code,
        usuario_codigo: user.code,
        usuario_nome: user.name,
        usuario_email: user.email,
      };
      return self.callDataset(
        "dsMoveTask_fluigAPI",
        {
          processId: String(numero),
          movementSequence: String(tarefa.movementSequence),
          targetState: String(self.ATIVIDADE_ARQUIVAR),
          assignee: user.code,
          asManager: "false",
          comment: "Ciência registrada pelo popup da Home",
        },
        [JSON.stringify(formFields)]
      ).then(function (rows) {
        var row = (rows && rows[0]) || {};
        var codigo = String(row.CODRETORNO || row.codretorno || "").toUpperCase();
        var detalhe = row.DESCRETORNO || row.descretorno || row.erro || row.ERRO || "";
        if (row.erro || row.ERRO || codigo === "ERROR") {
          throw detalhe || row.ERRO || row.erro || "dsMoveTask_fluigAPI retornou erro.";
        }
        if (typeof detalhe === "string" && detalhe.charAt(0) === "{") {
          try {
            var json = JSON.parse(detalhe);
            if (json && !json.processInstanceId && (json.message || json.detailedMessage || String(json.status || "").toUpperCase() === "ERROR")) {
              throw json.detailedMessage || json.message || detalhe;
            }
          } catch (eParse) {
            if (eParse && !/JSON|Unexpected/i.test(String(eParse.message || eParse))) {
              throw eParse;
            }
          }
        }
        if (codigo && codigo !== "OK") {
          throw detalhe || codigo;
        }
        return self.persistirAuditoria(item, formFields).then(function () {
          return row;
        });
      });
    });
  },

  atividadeAberta: function (numero) {
    var self = this;
    return this.ajaxGet("/process-management/api/v2/requests/" + encodeURIComponent(String(numero)) + "/tasks")
      .then(function (json) {
        var tarefa = self.tarefaDeJson(json);
        if (tarefa) return tarefa;
        throw "sem tarefa na API";
      })
      .catch(function () {
        return self.callDataset("processHistory", {
          active: "true",
          "processHistoryPK.processInstanceId": String(numero),
        }).then(function (rows) {
          var row = (rows && rows[0]) || {};
          var seq = self.campo(row, "processHistoryPK.movementSequence") || self.campo(row, "movementSequence");
          if (!seq && typeof DatasetFactory !== "undefined") {
            return self.atividadeViaFactory(numero);
          }
          if (!seq) throw "processHistory sem movementSequence";
          return {
            movementSequence: seq,
            stateSequence: self.campo(row, "stateSequence") || self.campo(row, "NUM_SEQ_ESTADO"),
          };
        });
      });
  },

  atividadeViaFactory: function (numero) {
    var Factory = window.DatasetFactory || (window.parent && window.parent.DatasetFactory) || (window.top && window.top.DatasetFactory);
    var Type = window.ConstraintType || (window.parent && window.parent.ConstraintType) || (window.top && window.top.ConstraintType);
    if (!Factory || !Type) throw "DatasetFactory indisponível";
    var ds = Factory.getDataset("processHistory", null, [
      Factory.createConstraint("active", true, true, Type.MUST),
      Factory.createConstraint("processHistoryPK.processInstanceId", String(numero), String(numero), Type.MUST),
    ], null);
    if (!ds || !ds.values || !ds.values.length) throw "processHistory vazio";
    return {
      movementSequence: ds.values[0]["processHistoryPK.movementSequence"],
      stateSequence: ds.values[0].stateSequence,
    };
  },

  tarefaDeJson: function (json) {
    var raiz = json && json.content && typeof json.content === "object" ? json.content : json;
    var lista = [];
    if (!raiz) return null;
    if (Array.isArray(raiz.items)) lista = raiz.items;
    else if (Array.isArray(raiz.tasksInfo)) lista = raiz.tasksInfo;
    else if (Array.isArray(raiz.tasks)) lista = raiz.tasks;
    else if (Array.isArray(raiz)) lista = raiz;
    for (var i = lista.length - 1; i >= 0; i--) {
      var t = lista[i] || {};
      var ativa = t.active === true || t.status === "NOT_COMPLETED" || t.stateSequence === this.ATIVIDADE_CIENCIA || (t.state && t.state.stateSequence === this.ATIVIDADE_CIENCIA);
      var seq = t.movementSequence || (t.taskPK && t.taskPK.movementSequence) || t.movement;
      var estado = t.stateSequence || (t.state && (t.state.stateSequence || t.state.sequence));
      if (seq && (ativa || String(estado) === String(this.ATIVIDADE_CIENCIA))) {
        return { movementSequence: seq, stateSequence: estado || this.ATIVIDADE_CIENCIA };
      }
    }
    if (lista.length && lista[lista.length - 1]) {
      var last = lista[lista.length - 1];
      var lastSeq = last.movementSequence || (last.taskPK && last.taskPK.movementSequence);
      if (lastSeq) {
        return {
          movementSequence: lastSeq,
          stateSequence: last.stateSequence || (last.state && last.state.stateSequence),
        };
      }
    }
    return null;
  },

  lerFicha: function (numero) {
    var self = this;
    if (!numero) return Promise.resolve({});
    var chave = String(numero);
    if (Object.prototype.hasOwnProperty.call(this.fichaCache, chave)) {
      return Promise.resolve(this.fichaCache[chave]);
    }
    var guardar = function (mapa) {
      self.fichaCache[chave] = mapa || {};
      return self.fichaCache[chave];
    };
    return this.ajaxGet("/process-management/api/v2/requests/" + encodeURIComponent(chave) + "?expand=formFields")
      .then(function (json) {
        var mapa = self.mapaDeFormulario(json);
        if (self.mapaTemFicha(mapa)) return guardar(mapa);
        throw "sem formFields";
      })
      .catch(function () {
        return self.lerFichaWorkflow(chave).then(guardar);
      })
      .catch(function () {
        return self.callDataset("ConfirmarCiencia", { numero_processo: chave }).then(function (rows) {
          var row = (rows && rows[0] && !rows[0].ERRO && rows[0]) || {};
          if (self.mapaTemFicha(row) || self.campo(row, "assunto") || self.campo(row, "exibir_popup")) {
            return guardar(row);
          }
          throw "sem ficha ConfirmarCiencia";
        });
      })
      .catch(function () {
        return self.callDataset("GestorConfirmarCiencia", { numero_processo: chave }).then(function (rows) {
          return guardar((rows && rows[0] && !rows[0].ERRO && rows[0]) || {});
        });
      })
      .catch(function () {
        return guardar({});
      });
  },

  lerFichaWorkflow: function (numero) {
    var self = this;
    var wcm = (top && top.WCMAPI) || window.WCMAPI || {};
    var companyId = /^\d+$/.test(String(wcm.organizationId || "")) ? wcm.organizationId : 1;
    var username = wcm.userLogin || wcm.userCode || "";
    var envelope =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://ws.workflow.ecm.technology.totvs.com/">' +
      "<soapenv:Header/><soapenv:Body><ws:getInstanceCardData>" +
      "<username>" +
      this.escapeXml(username) +
      "</username><password></password><companyId>" +
      companyId +
      "</companyId><processInstanceId>" +
      this.escapeXml(String(numero)) +
      "</processInstanceId></ws:getInstanceCardData></soapenv:Body></soapenv:Envelope>";
    return this.ajaxSoap("/webdesk/WorkflowEngineService", envelope).then(function (texto) {
      if (/faultstring|Fault>|not recognized/i.test(texto || "")) {
        throw texto;
      }
      return self.parseCardDataXml(texto);
    });
  },

  mapaDeFormulario: function (json) {
    if (!json || typeof json !== "object") return {};
    var raiz = json.content && typeof json.content === "object" ? json.content : json;
    var candidatos = [raiz.formFields, raiz.formData, raiz.fields, raiz.values];
    var mapa = {};
    for (var c = 0; c < candidatos.length; c++) {
      var fields = candidatos[c];
      if (!fields) continue;
      if (Array.isArray(fields)) {
        fields.forEach(function (item) {
          if (!item || typeof item !== "object") return;
          var k = item.fieldId || item.field || item.key || item.name;
          var v = item.value != null ? item.value : item.val;
          if (k && v != null && String(v) !== "") mapa[k] = v;
        });
      } else if (typeof fields === "object") {
        Object.keys(fields).forEach(function (k) {
          var bruto = fields[k];
          var v = bruto && typeof bruto === "object" && bruto.value != null ? bruto.value : bruto;
          if (v != null && typeof v !== "object" && String(v) !== "") mapa[k] = v;
        });
      }
    }
    return mapa;
  },

  mapaTemFicha: function (mapa) {
    if (!mapa) return false;
    return !!(
      mapa.exibir_popup ||
      mapa.EXIBIR_POPUP ||
      mapa.titulo ||
      mapa.TITULO ||
      mapa.assunto ||
      mapa.ASSUNTO ||
      mapa.data_fim ||
      mapa.status ||
      mapa.texto_botao_acao ||
      mapa.tipo_conteudo ||
      mapa.numero_processo_pai ||
      mapa.NUMERO_PROCESSO_PAI
    );
  },

  parseCardDataXml: function (texto) {
    var mapa = {};
    var xml = String(texto || "");
    var gravar = function (chave, valor) {
      var k = String(chave || "").trim();
      var v = String(valor || "")
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
        .replace(/<[^>]+>/g, "")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .trim();
      if (k && v) mapa[k] = v;
    };
    var reKv = /<(?:\w+:)?(?:key|field|itemKey)[^>]*>([^<]+)<\/(?:\w+:)?(?:key|field|itemKey)>\s*<(?:\w+:)?(?:value|itemValue)\b[^>]*>([\s\S]*?)<\/(?:\w+:)?(?:value|itemValue)>/gi;
    var m;
    while ((m = reKv.exec(xml))) {
      gravar(m[1], m[2]);
    }
    return mapa;
  },

  garantirUrlAnexo: function (item) {
    if (!item || item.DOCUMENT_URL || !item.DOCUMENT_ID) {
      return Promise.resolve(item);
    }
    return this.ajaxGet("/api/public/2.0/documents/getDownloadURL/" + encodeURIComponent(String(item.DOCUMENT_ID)))
      .then(function (json) {
        var url = json && (json.content || json.url || json.downloadURL);
        if (url) item.DOCUMENT_URL = typeof url === "string" ? url : url.url || "";
        return item;
      })
      .catch(function () {
        return item;
      });
  },

  parseAnexos: function (bruto) {
    if (!bruto) return [];
    if (Array.isArray(bruto)) return bruto;
    if (typeof bruto === "object") return bruto.documentId ? [bruto] : [];
    try {
      var json = JSON.parse(bruto);
      if (Array.isArray(json)) return json;
      if (json && json.documentId) return [json];
    } catch (e) {}
    return [];
  },

  usuario: function () {
    var wcm =
      (window.top && window.top.WCMAPI) ||
      (window.parent && window.parent.WCMAPI) ||
      window.WCMAPI ||
      {};
    var code = wcm.userCode || wcm.userLogin || "";
    try {
      if (!code && wcm.getUserCode) {
        code = wcm.getUserCode() || "";
      }
    } catch (eCode) {}
    return {
      code: code,
      name: wcm.user || wcm.userName || "",
      email: wcm.userEmail || "",
    };
  },

  campo: function (row, nome) {
    if (!row || nome == null) return "";
    if (row[nome] != null && String(row[nome]) !== "") return String(row[nome]);
    var alvo = String(nome).toLowerCase();
    var keys = Object.keys(row);
    for (var i = 0; i < keys.length; i++) {
      if (String(keys[i]).toLowerCase() === alvo && row[keys[i]] != null && String(row[keys[i]]) !== "") {
        return String(row[keys[i]]);
      }
    }
    return "";
  },

  flagSN: function (value) {
    var texto = String(value == null ? "" : value).trim().toLowerCase();
    if (texto === "s" || texto === "true" || texto === "1" || texto === "on" || texto === "sim") return "S";
    if (texto === "n" || texto === "false" || texto === "0" || texto === "off" || texto === "nao" || texto === "não") return "N";
    return "";
  },

  isoDate: function (value) {
    var texto = String(value == null ? "" : value).trim();
    if (!texto) return "";
    var iso = texto.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return iso[1] + "-" + iso[2] + "-" + iso[3];
    var br = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (br) return br[3] + "-" + br[2] + "-" + br[1];
    return texto.length >= 10 ? texto.substring(0, 10) : "";
  },

  hojeIso: function () {
    var d = new Date();
    return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
  },

  agora: function () {
    var d = new Date();
    var p = function (n) {
      return ("0" + n).slice(-2);
    };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + " " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
  },

  callDataset: function (name, constraints, fields) {
    var body = {
      name: name,
      fields: fields || null,
      constraints: constraints
        ? Object.keys(constraints).map(function (key) {
            var c = constraints[key];
            var initial = c && typeof c === "object" && c.initialValue != null ? c.initialValue : c;
            var final = c && typeof c === "object" && c.finalValue != null ? c.finalValue : initial;
            return {
              _field: key,
              _initialValue: initial,
              _finalValue: final,
              _type: 1,
              _likeSearch: false,
            };
          })
        : null,
    };

    return Promise.race([
      fetch("/api/public/ecm/dataset/datasets", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      }).then(function (response) {
        return response.json().then(function (json) {
          if (!response.ok) {
            throw (json && (json.message || json.detailedMessage)) || "HTTP " + response.status;
          }
          return json.content && json.content.values ? json.content.values : [];
        });
      }),
      new Promise(function (_, reject) {
        setTimeout(function () {
          reject("timeout ds " + name);
        }, 12000);
      }),
    ]);
  },

  persistirAuditoria: function (item, campos) {
    var self = this;
    var numero = item && item.NUMERO_PROCESSO;
    if (!numero) return Promise.resolve();
    return this.cardIdDaCiencia(numero)
      .then(function (cardId) {
        if (!cardId) {
          console.warn("[ComunicadoHome] auditoria sem cardId", numero);
          return;
        }
        return self.atualizarFichaSoap(cardId, campos);
      })
      .catch(function (e) {
        console.warn("[ComunicadoHome] persistirAuditoria", e);
      });
  },

  cardIdDaCiencia: function (numero) {
    var self = this;
    return this.ajaxGet("/process-management/api/v2/requests/" + encodeURIComponent(String(numero)))
      .then(function (json) {
        var raiz = json && json.content && typeof json.content === "object" ? json.content : json;
        var id =
          (raiz && (raiz.formRecordId || raiz.cardDocumentId || raiz.documentId || raiz.formIdRelated)) || "";
        if (id) return id;
        throw "sem formRecordId";
      })
      .catch(function () {
        return self
          .callDataset("workflowProcess", {
            "workflowProcessPK.processInstanceId": String(numero),
          })
          .then(function (rows) {
            var row = (rows && rows[0]) || {};
            return self.campo(row, "cardDocumentId") || self.campo(row, "documentId") || self.campo(row, "cardId") || "";
          });
      });
  },

  atualizarFichaSoap: function (documentId, campos) {
    var self = this;
    var wcm = (top && top.WCMAPI) || window.WCMAPI || {};
    var companyId = /^\d+$/.test(String(wcm.organizationId || "")) ? wcm.organizationId : 1;
    var username = wcm.userLogin || wcm.userCode || "";
    var itens = Object.keys(campos || {})
      .map(function (key) {
        return (
          "<item><field>" +
          self.escapeXml(key) +
          "</field><value>" +
          self.escapeXml(campos[key]) +
          "</value></item>"
        );
      })
      .join("");
    var envelope =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://ws.dm.ecm.technology.totvs.com/">' +
      "<soapenv:Header/><soapenv:Body><ws:updateCardData>" +
      "<companyId>" +
      companyId +
      "</companyId><username>" +
      this.escapeXml(username) +
      "</username><password></password><cardId>" +
      this.escapeXml(String(documentId)) +
      "</cardId><cardData>" +
      itens +
      "</cardData></ws:updateCardData></soapenv:Body></soapenv:Envelope>";
    return this.ajaxSoap("/webdesk/ECMCardService", envelope).then(function (texto) {
      if (/<html[\s>]/i.test(texto || "") || /faultstring|Fault>/i.test(texto || "")) {
        throw texto;
      }
      return texto;
    });
  },

  ajaxGet: function (path) {
    return fetch(path, { method: "GET", credentials: "same-origin", headers: { Accept: "application/json" } }).then(function (response) {
      return response.json().then(function (json) {
        if (!response.ok) {
          throw (json && (json.message || json.detailedMessage)) || "HTTP " + response.status;
        }
        return json || {};
      });
    });
  },

  ajaxSoap: function (path, xml) {
    return fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "text/xml; charset=UTF-8", SOAPAction: "" },
      body: xml,
    }).then(function (response) {
      return response.text();
    });
  },

  escapeHtml: function (text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  escapeXml: function (value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },

  erroTexto: function (erro) {
    if (erro == null) return "";
    if (typeof erro === "string") return erro.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 280);
    return String(erro.message || erro);
  },
});
