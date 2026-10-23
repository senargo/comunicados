function validateForm(form) {
  normalizeFlag(form, "sem_data_expiracao");
  normalizeFlag(form, "exibir_popup");
  normalizeFlag(form, "agendamento_futuro");
  normalizeFlag(form, "cancelado");
  normalizeFlag(form, "excluido");
  normalizeFlag(form, "publicado");

  if (!form.getValue("titulo")) {
    throw "Informe o título do comunicado.";
  }

  var semExpiracao = form.getValue("sem_data_expiracao") == "S";
  var dataInicio = form.getValue("data_inicio");
  var dataFim = form.getValue("data_fim");

  if (!dataInicio) {
    throw "Informe a data de início.";
  }

  if (!semExpiracao && !dataFim) {
    throw "Informe a data de fim ou marque 'Sem data de expiração'.";
  }

  if (!semExpiracao && dataInicio && dataFim && dataFim < dataInicio) {
    throw "A data de fim deve ser posterior à data de início.";
  }

  var today = new java.text.SimpleDateFormat("yyyy-MM-dd").format(new java.util.Date());
  if (!semExpiracao && dataFim && String(dataFim).substring(0, 10) < today) {
    throw "A data de fim não pode ser anterior a hoje.";
  }

  if (form.getValue("agendamento_futuro") == "S") {
    if (String(dataInicio).substring(0, 10) <= today) {
      throw "Para agendamento futuro, a data de início deve ser posterior a hoje.";
    }
  }

  var tipoConteudo = form.getValue("tipo_conteudo") || "pdf";
  if ((tipoConteudo == "youtube" || tipoConteudo == "link") && !form.getValue("url_conteudo")) {
    throw "Informe o link do conteúdo.";
  }

  if (tipoConteudo != "youtube" && tipoConteudo != "link") {
    var anexos = form.getValue("documentos_anexos");
    if (!anexos || anexos == "[]") {
      throw "Anexe o conteúdo do comunicado.";
    }
  }
}

function normalizeFlag(form, field) {
  if (form.getValue(field) != "S") {
    form.setValue(field, "N");
  }
}
