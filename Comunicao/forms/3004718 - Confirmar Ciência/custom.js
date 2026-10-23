var adobeDCView;
var _cienciaRenderTentativas = 0;

window.onload = function () {
  if (top.$) {
    top.$("#tab-attachments").remove();
  }
  renderConteudoCiencia();
};

function renderConteudoCiencia() {
  var tipo = typeof TIPO_CONTEUDO !== "undefined" && TIPO_CONTEUDO ? String(TIPO_CONTEUDO).toLowerCase() : "pdf";
  var urlExterna = typeof URL_CONTEUDO !== "undefined" ? String(URL_CONTEUDO || "") : "";
  var anexo = typeof DOCUMENTOS_ANEXOS !== "undefined" ? DOCUMENTOS_ANEXOS : {};
  var urlAnexo = anexo && anexo.documentUrl ? String(anexo.documentUrl) : "";
  var nomeArquivo = anexo && anexo.documentDescription ? String(anexo.documentDescription) : "";

  if ((!tipo || tipo === "pdf") && nomeArquivo) {
    tipo = inferTipoPorNome(nomeArquivo);
  }
  if ((!tipo || tipo === "pdf") && urlExterna) {
    tipo = inferTipoPorUrl(urlExterna);
  }

  if (tipo === "pdf" && urlAnexo) {
    $("#conteudo-alternativo").empty();
    $("#adobe-dc-view").show();
    if (typeof adobeDCView !== "undefined" && adobeDCView) {
      adobeDCView.previewFile(
        {
          content: { location: { url: urlAnexo } },
          metaData: { fileName: nomeArquivo || "documento.pdf" },
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
      return;
    }
    _cienciaRenderTentativas += 1;
    if (_cienciaRenderTentativas < 8) {
      setTimeout(renderConteudoCiencia, 400);
      return;
    }
    mostrarHtmlAlternativo('<a class="btn btn-primary" href="' + escaparAtributo(urlAnexo) + '" target="_blank" rel="noopener">Abrir PDF</a>');
    return;
  }

  var html = "";
  if ((tipo === "imagem" || tipo === "gif") && urlAnexo) {
    html = '<img src="' + escaparAtributo(urlAnexo) + '" style="max-width:100%;height:auto;" alt="Comunicado" />';
  } else if (tipo === "video" && urlAnexo) {
    html = '<video src="' + escaparAtributo(urlAnexo) + '" controls style="width:100%;max-height:480px;"></video>';
  } else if (tipo === "youtube" && urlExterna) {
    html =
      '<iframe src="' +
      escaparAtributo(toYoutubeEmbed(urlExterna)) +
      '" style="width:100%;min-height:360px;border:0;" allowfullscreen></iframe>';
  } else if (tipo === "link" && urlExterna) {
    html =
      '<a class="btn btn-primary" href="' +
      escaparAtributo(urlExterna) +
      '" target="_blank" rel="noopener">Abrir conteúdo</a>';
  } else if (urlAnexo) {
    html = '<a class="btn btn-primary" href="' + escaparAtributo(urlAnexo) + '" target="_blank" rel="noopener">Abrir anexo</a>';
  } else if (urlExterna) {
    html = '<a class="btn btn-primary" href="' + escaparAtributo(urlExterna) + '" target="_blank" rel="noopener">Abrir conteúdo</a>';
  }

  mostrarHtmlAlternativo(html);
}

function mostrarHtmlAlternativo(html) {
  $("#adobe-dc-view").hide();
  $("#conteudo-alternativo").html(html || "");
}

function inferTipoPorNome(nome) {
  var n = String(nome || "").toLowerCase();
  if (n.indexOf(".gif") !== -1) return "gif";
  if (/\.(png|jpe?g|webp|bmp)$/.test(n)) return "imagem";
  if (/\.(mp4|webm|ogg)$/.test(n)) return "video";
  if (n.indexOf(".pdf") !== -1) return "pdf";
  return "pdf";
}

function inferTipoPorUrl(url) {
  if (/youtu\.be|youtube\.com/i.test(url || "")) return "youtube";
  if (url) return "link";
  return "pdf";
}

function toYoutubeEmbed(url) {
  if (!url) return "";
  var match = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]+)/);
  if (match && match[1]) {
    return "https://www.youtube.com/embed/" + match[1];
  }
  return url;
}

function escaparAtributo(valor) {
  return String(valor || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

document.addEventListener("adobe_dc_view_sdk.ready", function () {
  if (typeof adobeDCView === "undefined" || !adobeDCView) {
    adobeDCView = new AdobeDC.View({ clientId: "5d4181db4f854cd7a4d999cb0718782c", divId: "adobe-dc-view" });
  }
  renderConteudoCiencia();
});
