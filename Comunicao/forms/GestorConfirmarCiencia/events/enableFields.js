function enableFields(form) {
  var atividadeAtual = getValue("WKNumState");
  var isInicio = form.getFormMode() == "ADD" || atividadeAtual == 0 || atividadeAtual == 4;

  if (isInicio) {
    return;
  }

  var campos = [
    "titulo",
    "descricao",
    "data_inicio",
    "data_fim",
    "texto_botao_acao",
    "publico_tipo",
    "publico_grupos",
    "publico_usuarios",
    "excecao_grupos",
    "excecao_usuarios",
    "documentos_anexos",
    "tipo_conteudo",
    "url_conteudo",
  ];

  for (var i = 0; i < campos.length; i++) {
    form.setEnabled(campos[i], false);
  }
}
