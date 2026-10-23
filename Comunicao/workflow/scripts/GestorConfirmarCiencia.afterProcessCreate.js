function afterProcessCreate(processId) {
  hAPI.setCardValue("numero_processo", processId);

  var titulo = hAPI.getCardValue("titulo") || "";
  hAPI.setCardValue("campo_descritor", "Comunicado " + titulo);

  if (!hAPI.getCardValue("data_criacao")) {
    var sdtf = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
    hAPI.setCardValue("data_criacao", sdtf.format(new java.util.Date()));
  }

  if (!hAPI.getCardValue("criado_por")) {
    hAPI.setCardValue("criado_por", getValue("WKUser"));
  }

  if (!hAPI.getCardValue("tipo_conteudo")) {
    hAPI.setCardValue("tipo_conteudo", "pdf");
  }

  if (!hAPI.getCardValue("texto_botao_acao")) {
    hAPI.setCardValue("texto_botao_acao", "Ciente");
  }

  normalizeCardFlag("cancelado");
  normalizeCardFlag("excluido");
  normalizeCardFlag("publicado");
  normalizeCardFlag("sem_data_expiracao");
  normalizeCardFlag("exibir_popup");
  normalizeCardFlag("agendamento_futuro");

  aplicarStatusInicial();
}

function aplicarStatusInicial() {
  if (hAPI.getCardValue("cancelado") == "S" || hAPI.getCardValue("excluido") == "S") {
    hAPI.setCardValue("status", "CANCELADO");
    return;
  }

  var today = new java.text.SimpleDateFormat("yyyy-MM-dd").format(new java.util.Date());
  var dataInicio = String(hAPI.getCardValue("data_inicio") || "").substring(0, 10);
  var dataFim = String(hAPI.getCardValue("data_fim") || "").substring(0, 10);
  var semExpiracao = hAPI.getCardValue("sem_data_expiracao") == "S";

  if (!semExpiracao && dataFim && dataFim < today) {
    hAPI.setCardValue("status", "EXPIRADO");
    return;
  }

  if (dataInicio && dataInicio > today) {
    hAPI.setCardValue("status", "AGENDADO");
    hAPI.setCardValue("publicado", "N");
    return;
  }

  if (!hAPI.getCardValue("status")) {
    hAPI.setCardValue("status", "AGENDADO");
  }
}

function normalizeCardFlag(field) {
  if (hAPI.getCardValue(field) != "S") {
    hAPI.setCardValue(field, "N");
  }
}
