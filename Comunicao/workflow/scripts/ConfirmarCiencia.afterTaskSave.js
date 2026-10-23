function afterTaskSave(colleagueId, nextSequenceId, userList) {
  hAPI.setCardValue("campo_descritor", descritorCiencia(hAPI.getCardValue("assunto")));

  var WKNumProces = getValue("WKNumProces");
  if (WKNumProces) {
    hAPI.setCardValue("numero_processo", String(WKNumProces));
  }

  var ATIVIDADE_CONFIRMAR = 12;
  var ATIVIDADE_DISCORDAR = 20;

  var sdtf = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

  var attachments = hAPI.listAttachments();
  if (attachments.size() >= 1) {
    var anexos = [];
    for (var i = 0; i < attachments.size(); i++) {
      var attachment = attachments.get(i);
      anexos.push({
        documentId: attachment.getDocumentId(),
        documentDescription: attachment.getDocumentDescription(),
      });
    }
    hAPI.setCardValue("documentos_anexos", JSONUtil.toJSON(anexos));
  }

  if (nextSequenceId == ATIVIDADE_CONFIRMAR || nextSequenceId == ATIVIDADE_DISCORDAR) {
    hAPI.setCardValue("resultado", nextSequenceId == ATIVIDADE_CONFIRMAR ? "aprovado" : "reprovado");
    if (!textoLimpo(hAPI.getCardValue("data_ciencia"))) {
      hAPI.setCardValue("data_ciencia", sdtf.format(new java.util.Date()));
    }
    preencherUsuarioCiencia(colleagueId);
  }
}

function preencherUsuarioCiencia(colleagueId) {
  var matricula = textoLimpo(hAPI.getCardValue("usuario_matricula")) || textoLimpo(colleagueId);
  if (matricula) {
    hAPI.setCardValue("usuario_matricula", matricula);
    if (!textoLimpo(hAPI.getCardValue("usuario_codigo"))) {
      hAPI.setCardValue("usuario_codigo", matricula);
    }
  }
  if (textoLimpo(hAPI.getCardValue("usuario_nome")) && textoLimpo(hAPI.getCardValue("usuario_email"))) {
    return;
  }
  if (!matricula) {
    return;
  }
  try {
    var c1 = DatasetFactory.createConstraint("colleaguePK.colleagueId", matricula, matricula, ConstraintType.MUST);
    var ds = DatasetFactory.getDataset("colleague", null, [c1], null);
    if (ds != null && ds.rowsCount > 0) {
      if (!textoLimpo(hAPI.getCardValue("usuario_nome"))) {
        hAPI.setCardValue("usuario_nome", ds.getValue(0, "colleagueName"));
      }
      if (!textoLimpo(hAPI.getCardValue("usuario_email"))) {
        var mail = ds.getValue(0, "mail");
        if (!mail) {
          mail = ds.getValue(0, "email");
        }
        if (mail) {
          hAPI.setCardValue("usuario_email", mail);
        }
      }
    }
  } catch (eCol) {}
}

function textoLimpo(value) {
  if (value == null) {
    return "";
  }
  var t = String(value).replace(/^\s+|\s+$/g, "");
  if (!t || t == "null" || t == "undefined" || t == "NaN") {
    return "";
  }
  return t;
}

function descritorCiencia(titulo) {
  var t = textoLimpo(titulo);
  return t ? "Confirmar ciência " + t : "Confirmar ciência";
}
