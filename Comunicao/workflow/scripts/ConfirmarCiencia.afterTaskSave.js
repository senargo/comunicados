function afterTaskSave(colleagueId, nextSequenceId, userList) {
  var baseCampoDescritor = "Confirmar ciência";
  var assunto = hAPI.getCardValue("assunto");
  hAPI.setCardValue("campo_descritor", baseCampoDescritor + " " + assunto);

  var WKNumProces = getValue("WKNumProces");
  hAPI.setCardValue("numero_processo", WKNumProces);
  
  var ATIVIDADE_CONFIRMAR = 12;
  var ATIVIDADE_DISCORDAR = 14;

  var sdtf = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
  
  var attachments = hAPI.listAttachments();
  if(attachments.size() >= 1){
    var anexos = new Array();
    for (var i = 0; i < attachments.size(); i++) {
      var attachment = attachments.get(i);
      var documentJSON = {
        documentId: attachment.getDocumentId(),
        documentDescription: attachment.getDocumentDescription(),
      }
      anexos.push(documentJSON);
    }

    hAPI.setCardValue("documentos_anexos", JSONUtil.toJSON(anexos));
  }

  if(nextSequenceId == ATIVIDADE_CONFIRMAR){
    hAPI.setCardValue("resultado", 'aprovado');
    hAPI.setCardValue("data_ciencia", sdtf.format(new java.util.Date()));

  }else if(nextSequenceId == ATIVIDADE_DISCORDAR){

    hAPI.setCardValue("resultado", 'reprovado');
    hAPI.setCardValue("data_ciencia", sdtf.format(new java.util.Date()));
  }
}
