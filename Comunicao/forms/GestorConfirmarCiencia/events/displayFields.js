function displayFields(form, customHTML) {
  var atividadeAtual = getValue("WKNumState");
  var user = getValue("WKUser");

  if (form.getFormMode() == "ADD" || atividadeAtual == 0 || atividadeAtual == 4) {
    var sdtf = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
    if (!form.getValue("data_criacao")) {
      form.setValue("data_criacao", sdtf.format(new java.util.Date()));
    }
    if (!form.getValue("criado_por")) {
      form.setValue("criado_por", user);
    }
    if (!form.getValue("texto_botao_acao")) {
      form.setValue("texto_botao_acao", "Ciente");
    }
    if (!form.getValue("publico_tipo")) {
      form.setValue("publico_tipo", "todos");
    }
    if (!form.getValue("tipo_conteudo")) {
      form.setValue("tipo_conteudo", "pdf");
    }

    setFlagDefault(form, "cancelado", "N");
    setFlagDefault(form, "excluido", "N");
    setFlagDefault(form, "publicado", "N");
    setFlagDefault(form, "sem_data_expiracao", "N");
    setFlagDefault(form, "exibir_popup", "N");
    setFlagDefault(form, "agendamento_futuro", "N");

    try {
      var c1 = DatasetFactory.createConstraint("colleaguePK.colleagueId", user, user, ConstraintType.MUST);
      var ds = DatasetFactory.getDataset("colleague", null, [c1], null);
      if (ds != null && ds.rowsCount > 0) {
        form.setValue("criado_por_nome", ds.getValue(0, "colleagueName"));
      }
    } catch (e) {
      log.error("GestorConfirmarCiencia displayFields: " + e);
    }
  }

  customHTML.append("<script>");
  customHTML.append("var formMode = '" + form.getFormMode() + "';");
  customHTML.append("</script>");
}

function setFlagDefault(form, field, value) {
  if (!form.getValue(field)) {
    form.setValue(field, value);
  }
}
