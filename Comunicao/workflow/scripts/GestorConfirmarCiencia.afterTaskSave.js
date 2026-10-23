function afterTaskSave(colleagueId, nextSequenceId, userList) {
  var titulo = hAPI.getCardValue("titulo") || "";
  hAPI.setCardValue("campo_descritor", "Comunicado " + titulo);

  var WKNumProces = getValue("WKNumProces");
  if (WKNumProces) {
    hAPI.setCardValue("numero_processo", WKNumProces);
  }

  if (hAPI.getCardValue("sem_data_expiracao") != "S") {
    hAPI.setCardValue("sem_data_expiracao", "N");
  }
  if (hAPI.getCardValue("exibir_popup") != "S") {
    hAPI.setCardValue("exibir_popup", "N");
  }
  if (hAPI.getCardValue("agendamento_futuro") != "S") {
    hAPI.setCardValue("agendamento_futuro", "N");
  }
  if (hAPI.getCardValue("cancelado") != "S") {
    hAPI.setCardValue("cancelado", "N");
  }
  if (hAPI.getCardValue("excluido") != "S") {
    hAPI.setCardValue("excluido", "N");
  }
}
