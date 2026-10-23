class ComunicadoHtmlBuilder {
  static statusClass(status) {
    const value = String(status || "").toUpperCase();
    if (value === "ATIVO") return "com-status-ativo";
    if (value === "AGENDADO") return "com-status-agendado";
    if (value === "EXPIRADO") return "com-status-expirado";
    if (value === "CANCELADO") return "com-status-cancelado";
    return "";
  }

  static txt(value) {
    return value == null || value === "null" || value === "undefined" ? "" : String(value);
  }

  static buildFiltersHtml() {
    return `
      <div class="lipeke-row" style="flex-wrap: wrap;">
        <div class="col-xs-12 col-md-3">
          <div class="lipeke-input-group">
            <input type="text" id="ftTitulo">
            <label for="ftTitulo">Título</label>
          </div>
        </div>
        <div class="col-xs-12 col-md-2">
          <div class="lipeke-input-group">
            <input type="date" id="ftInicial">
            <label for="ftInicial">Data inicial</label>
          </div>
        </div>
        <div class="col-xs-12 col-md-2">
          <div class="lipeke-input-group">
            <input type="date" id="ftFinal">
            <label for="ftFinal">Data final</label>
          </div>
        </div>
        <div class="col-xs-12 col-md-3">
          <div class="lipeke-input-group">
            <div id="usuario_fluig"></div>
          </div>
        </div>
        <div class="col-xs-12 col-md-2">
          <div class="lipeke-input-group">
            <select id="ftStatus">
              <option value="" selected="">Todos</option>
              <option value="AGENDADO">Agendado</option>
              <option value="ATIVO">Ativo</option>
              <option value="EXPIRADO">Expirado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
            <label for="ftStatus">Status</label>
          </div>
        </div>
        <div class="col-xs-12 col-md-2">
          <div class="lipeke-input-group">
            <select id="ftExpiracao">
              <option value="" selected="">Todas</option>
              <option value="N">Com expiração</option>
              <option value="S">Sem expiração</option>
            </select>
            <label for="ftExpiracao">Expiração</label>
          </div>
        </div>
        <div class="col-xs-12 col-md-2">
          <div class="lipeke-input-group">
            <select id="ftAceite">
              <option value="" selected="">Todos</option>
              <option value="com">Com aceite</option>
              <option value="sem">Sem aceite</option>
            </select>
            <label for="ftAceite">Assinaturas</label>
          </div>
        </div>
      </div>
    `;
  }

  static buildGrid(data) {
    if (!data || !data.length) {
      return `<h2 class="fs-text-center" style="margin: 24px auto;">Nenhum comunicado encontrado com os filtros informados.</h2>`;
    }

    const rows = data
      .map((el, id) => {
        const dataCriacao = ComunicadoService.formatarData(el.DATA_CRIACAO) || "—";
        const dataExpiracao = el.DATA_FIM
          ? ComunicadoService.formatarData(el.DATA_FIM) || ComunicadoHtmlBuilder.txt(el.DATA_FIM) || "—"
          : el.SEM_DATA_EXPIRACAO === "S"
            ? "Sem expiração"
            : "—";
        const statusLabel = ComunicadoHtmlBuilder.txt(el.STATUS);
        const statusClass = ComunicadoHtmlBuilder.statusClass(el.STATUS);
        return `
          <tr class="com-row" data-index="${id}">
            <td>${ComunicadoHtmlBuilder.txt(el.NUMERO_PROCESSO) || "-"}</td>
            <td>${ComunicadoHtmlBuilder.txt(el.TITULO)}</td>
            <td>${dataCriacao}</td>
            <td>${el.QTD_ACEITES || 0}</td>
            <td>${el.QTD_PENDENTES || 0}</td>
            <td>${ComunicadoHtmlBuilder.txt(el.CRIADO_POR_NOME || el.CRIADO_POR)}</td>
            <td>${dataExpiracao}</td>
            <td><span class="com-status ${statusClass}">${statusLabel}</span></td>
            <td class="com-acoes">
              <button class="btn btn-default btn-sm btn-editar" data-index="${id}">Editar</button>
              <button class="btn btn-warning btn-sm btn-cancelar" data-index="${id}">Cancelar</button>
              <button class="btn btn-danger btn-sm btn-excluir" data-index="${id}">Excluir</button>
              <button type="button" class="btn btn-default btn-sm btn-preview" data-index="${id}" title="Preview">
                <svg class="com-icon-eye" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span class="sr-only">Preview</span>
              </button>
              <button class="btn btn-success btn-sm btn-detalhe" data-index="${id}">Detalhe</button>
            </td>
          </tr>
        `;
      })
      .join("");

    return `
      <div class="table-responsive">
        <table class="table table-striped table-hover com-grid">
          <thead>
            <tr>
              <th>Nº Processo</th>
              <th>Título</th>
              <th>Data de criação</th>
              <th>Qtd aceites</th>
              <th>Qtd pendente</th>
              <th>Criado por</th>
              <th>Data de expiração</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  static buildPaginacao({ page, total, pageSize } = {}) {
    const size = Math.max(1, parseInt(pageSize, 10) || 10);
    const totalReg = Math.max(0, parseInt(total, 10) || 0);
    const totalPages = Math.max(1, Math.ceil(totalReg / size));
    const atual = Math.min(totalPages, Math.max(1, parseInt(page, 10) || 1));
    const inicio = totalReg ? (atual - 1) * size + 1 : 0;
    const fim = Math.min(atual * size, totalReg);
    const desabilitarAnt = atual <= 1 ? "disabled" : "";
    const desabilitarProx = atual >= totalPages ? "disabled" : "";
    return `
      <div class="com-paginacao">
        <button type="button" class="btn btn-default btn-sm" id="comPagPrimeira" ${desabilitarAnt}>Primeira</button>
        <button type="button" class="btn btn-default btn-sm" id="comPagAnt" ${desabilitarAnt}>Anterior</button>
        <span class="com-paginacao-info">Página ${atual} de ${totalPages} · ${inicio}-${fim} de ${totalReg}</span>
        <button type="button" class="btn btn-default btn-sm" id="comPagProx" ${desabilitarProx}>Próxima</button>
        <button type="button" class="btn btn-default btn-sm" id="comPagUltima" ${desabilitarProx}>Última</button>
      </div>
    `;
  }

  static buildModalHtml(form = {}) {
    const isEdit = !!form.NUMERO_PROCESSO;
    return `
      <div class="fluig-style-guide com-modal-form">
        <div class="row">
          <div class="col-md-12">
            <div class="lipeke-input-group">
              <input type="text" id="comTitulo" value="${form.TITULO || ""}">
              <label class="required" for="comTitulo">Título</label>
            </div>
          </div>
          <div class="col-md-12">
            <div class="lipeke-input-group">
              <textarea id="comDescricao" rows="3">${form.DESCRICAO || ""}</textarea>
              <label for="comDescricao">Descrição</label>
            </div>
          </div>
          <div class="col-md-4">
            <div class="lipeke-input-group">
              <input type="date" id="comInicio" value="${ComunicadoService.isoDate(form.DATA_INICIO) || ""}">
              <label class="required" for="comInicio">Data de início</label>
            </div>
          </div>
          <div class="col-md-4">
            <div class="lipeke-input-group">
              <input type="date" id="comFim" value="${ComunicadoService.isoDate(form.DATA_FIM) || ""}">
              <label for="comFim">Data de fim</label>
            </div>
          </div>
          <div class="col-md-4">
            <div class="lipeke-input-group">
              <input type="text" id="comBotao" value="${form.TEXTO_BOTAO_ACAO || ComunicadoConstants.BOTAO_PADRAO}">
              <label for="comBotao">Texto do botão de ação</label>
            </div>
          </div>
          <div class="col-md-12">
            <div class="com-check-row">
              <label class="com-check" for="comSemExpiracao"><input type="checkbox" id="comSemExpiracao" ${form.SEM_DATA_EXPIRACAO === "S" ? "checked" : ""}> Sem data de expiração</label>
              <label class="com-check" for="comPopup"><input type="checkbox" id="comPopup" ${form.EXIBIR_POPUP === "S" ? "checked" : ""}> Exibir como Popup</label>
              <label class="com-check" for="comAgendar"><input type="checkbox" id="comAgendar" ${form.AGENDAMENTO_FUTURO === "S" ? "checked" : ""}> Agendamento futuro</label>
            </div>
          </div>
          <div class="col-md-12"><hr><h5>Público-alvo</h5></div>
          <div class="col-md-12">
            <label class="com-check"><input type="checkbox" id="comTodos" ${(form.PUBLICO_TIPO || "todos") === "todos" ? "checked" : ""}> Todos os usuários</label>
          </div>
          <div class="col-md-6">
            <div class="lipeke-input-group">
              <div id="comGrupo"></div>
            </div>
            <div id="comGruposChips" class="com-chips"></div>
          </div>
          <div class="col-md-6">
            <div class="lipeke-input-group">
              <div id="comUsuario"></div>
            </div>
            <div id="comUsuariosChips" class="com-chips"></div>
          </div>
          <div class="col-md-12"><hr><h5>Exceções de visualização</h5></div>
          <div class="col-md-6">
            <div class="lipeke-input-group">
              <div id="comExcGrupo"></div>
            </div>
            <div id="comExcGruposChips" class="com-chips"></div>
          </div>
          <div class="col-md-6">
            <div class="lipeke-input-group">
              <div id="comExcUsuario"></div>
            </div>
            <div id="comExcUsuariosChips" class="com-chips"></div>
          </div>
          <div class="col-md-12"><hr><h5>Conteúdo</h5></div>
          <div class="col-md-4">
            <div class="lipeke-input-group">
              <select id="comTipo">
                <option value="pdf">PDF</option>
                <option value="imagem">Imagem</option>
                <option value="gif">GIF</option>
                <option value="video">Vídeo</option>
                <option value="youtube">Link do YouTube</option>
                <option value="link">Link interno ou externo</option>
              </select>
              <label for="comTipo">Tipo de conteúdo</label>
            </div>
          </div>
          <div class="col-md-8" id="comUploadWrap">
            <div class="lipeke-input-group">
              <input type="file" id="comArquivo" accept=".pdf,.png,.jpg,.jpeg,.gif,.mp4,.webm,.ogg">
              <label for="comArquivo">Upload de anexo</label>
            </div>
            <small id="comArquivoAtual" class="text-muted"></small>
          </div>
          <div class="col-md-8" id="comUrlWrap" style="display:none;">
            <div class="lipeke-input-group">
              <input type="text" id="comUrl" value="${form.URL_CONTEUDO || ""}">
              <label for="comUrl">Link</label>
            </div>
          </div>
        </div>
        <div class="row" style="margin-top: 20px;">
          <div class="col-md-6 fs-text-center">
            <button type="button" class="lipeke-btn" id="comCancelarModal">Cancelar</button>
          </div>
          <div class="col-md-6 fs-text-center">
            <button type="button" class="lipeke-btn success" id="comSalvarModal">${isEdit ? "Salvar alterações" : "Salvar"}</button>
          </div>
        </div>
      </div>
    `;
  }

  static buildCienciasHtml(items, resumo) {
    if (!items.length) {
      return `<p class="fs-text-center">Nenhuma ciência registrada para este comunicado.</p>`;
    }

    const aceites = resumo && resumo.QTD_ACEITES != null ? resumo.QTD_ACEITES : items.filter((el) => el.SITUACAO_CODIGO === "aprovado" || el.SITUACAO === "Aceite").length;
    const pendentes = resumo && resumo.QTD_PENDENTES != null ? resumo.QTD_PENDENTES : items.filter((el) => el.SITUACAO_CODIGO === "pendente" || el.SITUACAO === "Pendente").length;

    const rows = items
      .map((el) => {
        const linha = el.SITUACAO_CODIGO ? el : ComunicadoService.montarAuditoria(el);
        return `
          <tr>
            <td>${ComunicadoHtmlBuilder.txt(linha.USUARIO)}</td>
            <td>${ComunicadoHtmlBuilder.txt(linha.DATA_ACEITE) || "-"}</td>
            <td>${ComunicadoHtmlBuilder.txt(linha.HORA_ACEITE) || "-"}</td>
            <td>${ComunicadoHtmlBuilder.txt(linha.SITUACAO)}</td>
          </tr>
        `;
      })
      .join("");

    return `
      <div class="com-auditoria-resumo">
        <span><strong>${aceites}</strong> aceite${aceites === 1 ? "" : "s"}</span>
        <span><strong>${pendentes}</strong> pendente${pendentes === 1 ? "" : "s"}</span>
        <span><strong>${items.length}</strong> destinatário${items.length === 1 ? "" : "s"}</span>
      </div>
      <div class="table-responsive">
        <table class="table table-striped com-auditoria">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Data do aceite</th>
              <th>Hora do aceite</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  static chip(label, key, type) {
    return `<span class="com-chip" data-key="${key}" data-type="${type}">${label}<i class="flaticon flaticon-close icon-sm"></i></span>`;
  }

  static esc(value) {
    return ComunicadoHtmlBuilder.txt(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  static adobeViewerConfig() {
    return {
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
    };
  }

  static buildPreviewHtml(preview) {
    const numero = ComunicadoHtmlBuilder.esc(preview.NUMERO_PROCESSO || "preview");
    const descricao = preview.DESCRICAO
      ? `<p class="com-preview-descricao">${ComunicadoHtmlBuilder.esc(preview.DESCRICAO)}</p>`
      : "";
    return `
      <div class="fluig-style-guide com-preview">
        <p class="com-preview-aviso">${ComunicadoHtmlBuilder.esc(preview.AVISO || "Preview administrativo: o botão não registra ciência.")}</p>
        ${descricao}
        <div class="com-preview-media">
          <div id="com-preview-adobe-${numero}" class="com-adobe-view" style="display:none;"></div>
          <div id="com-preview-alt-${numero}" class="com-media-alt"></div>
        </div>
      </div>
    `;
  }

  static pintarPreviewMidia(preview) {
    if (!preview) return;
    const numero = preview.NUMERO_PROCESSO || "preview";
    const adobe = $("#com-preview-adobe-" + numero);
    const alt = $("#com-preview-alt-" + numero);
    if (!adobe.length && !alt.length) return;

    const tipo = String(preview.TIPO_CONTEUDO || "pdf").toLowerCase();
    const urlAnexo = preview.DOCUMENT_URL || "";
    const urlExterna = preview.URL_CONTEUDO || "";

    if (tipo === "pdf" && urlAnexo) {
      alt.empty();
      adobe.show();
      ComunicadoHtmlBuilder.exibirPdfAdobePreview(preview, 0);
      return;
    }

    adobe.hide().empty();
    alt.html(ComunicadoHtmlBuilder.htmlMidiaPreview(tipo, urlAnexo, urlExterna) || "<p class=\"text-muted\">Nenhum conteúdo para exibir.</p>");
  }

  static htmlMidiaPreview(tipo, urlAnexo, urlExterna) {
    const esc = ComunicadoHtmlBuilder.esc;
    if ((tipo === "imagem" || tipo === "gif") && urlAnexo) {
      return `<img src="${esc(urlAnexo)}" alt="Comunicado" />`;
    }
    if (tipo === "video" && urlAnexo) {
      return `<video src="${esc(urlAnexo)}" controls></video>`;
    }
    if (tipo === "youtube" && urlExterna) {
      return `<iframe src="${esc(ComunicadoService.toYoutubeEmbed(urlExterna))}" allowfullscreen></iframe>`;
    }
    if (tipo === "link" && urlExterna) {
      return `<a class="btn btn-primary" href="${esc(urlExterna)}" target="_blank" rel="noopener">Abrir conteúdo</a>`;
    }
    if (urlAnexo) {
      return `<a class="btn btn-primary" href="${esc(urlAnexo)}" target="_blank" rel="noopener">Abrir anexo</a>`;
    }
    if (urlExterna) {
      return `<a class="btn btn-primary" href="${esc(urlExterna)}" target="_blank" rel="noopener">Abrir conteúdo</a>`;
    }
    return "";
  }

  static exibirPdfAdobePreview(preview, tentativa) {
    const divId = "com-preview-adobe-" + (preview.NUMERO_PROCESSO || "preview");
    if (!$("#" + divId).length) return;
    ComunicadoHtmlBuilder.garantirAdobeSdk().then(function () {
      if (!$("#" + divId).length) return;
      if (typeof AdobeDC === "undefined" || !AdobeDC.View) {
        if (tentativa < 8) {
          setTimeout(function () {
            ComunicadoHtmlBuilder.exibirPdfAdobePreview(preview, tentativa + 1);
          }, 400);
          return;
        }
        ComunicadoHtmlBuilder.fallbackPdfPreview(preview);
        return;
      }
      try {
        const view = new AdobeDC.View({
          clientId: ComunicadoConstants.ADOBE_CLIENT_ID,
          divId: divId,
        });
        view.previewFile(
          {
            content: { location: { url: preview.DOCUMENT_URL } },
            metaData: { fileName: preview.DOCUMENT_NAME || "documento.pdf" },
          },
          ComunicadoHtmlBuilder.adobeViewerConfig()
        );
      } catch (eAdobe) {
        console.warn("ComunicadoHtmlBuilder adobe preview", eAdobe);
        if (tentativa < 8) {
          setTimeout(function () {
            ComunicadoHtmlBuilder.exibirPdfAdobePreview(preview, tentativa + 1);
          }, 400);
          return;
        }
        ComunicadoHtmlBuilder.fallbackPdfPreview(preview);
      }
    });
  }

  static fallbackPdfPreview(preview) {
    const numero = preview.NUMERO_PROCESSO || "preview";
    $("#com-preview-adobe-" + numero).hide().empty();
    $("#com-preview-alt-" + numero).html(
      `<a class="btn btn-primary" href="${ComunicadoHtmlBuilder.esc(preview.DOCUMENT_URL)}" target="_blank" rel="noopener">Abrir PDF</a>`
    );
  }

  static garantirAdobeSdk() {
    if (window.AdobeDC) {
      return Promise.resolve();
    }
    if (ComunicadoHtmlBuilder._adobeSdk) {
      return ComunicadoHtmlBuilder._adobeSdk;
    }
    ComunicadoHtmlBuilder._adobeSdk = new Promise(function (resolve) {
      var feito = false;
      var terminar = function () {
        if (feito) return;
        feito = true;
        resolve();
      };
      document.addEventListener("adobe_dc_view_sdk.ready", terminar);
      if (!document.getElementById("adobe-view-sdk-preview")) {
        var script = document.createElement("script");
        script.id = "adobe-view-sdk-preview";
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
        ComunicadoHtmlBuilder._adobeSdk = null;
      }
    });
    return ComunicadoHtmlBuilder._adobeSdk;
  }
}
