function beforeTaskSave(colleagueId, nextSequenceId, userList) {
	var documentos_anexos = hAPI.getCardValue("documentos_anexos");
	if (documentos_anexos == "") {
	  return true;
	}
	
	var attachments = hAPI.listAttachments();
	
	var documentos = JSON.parse(documentos_anexos);
	if (documentos.length == 0) {
	  throw "É necessário anexar um documento para prosseguir.";
    } else if (documentos.length == 1 & attachments.size() == 0) {
      hAPI.attachDocument(documentos[0].documentId);
    }
}
