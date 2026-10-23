function beforeTaskSave(colleagueId, nextSequenceId, userList) {
  var documentos_anexos = hAPI.getCardValue("documentos_anexos");
  if (documentos_anexos == null || documentos_anexos == "" || documentos_anexos == "[]") {
    return true;
  }

  var attachments = hAPI.listAttachments();
  var documentos = [];
  try {
    documentos = JSON.parse(documentos_anexos);
  } catch (e) {
    return true;
  }

  if (!documentos || documentos.length == 0) {
    return true;
  }

  if (documentos.length == 1 && attachments.size() == 0 && documentos[0].documentId) {
    hAPI.attachDocument(documentos[0].documentId);
  }
}
