/**
 * Comunicado mestre (GestorConfirmarCiencia).
 * Cria ciências (ConfirmarCiencia) por destinatário.
 * Status: AGENDADO (data futura ou lote pendente) | ATIVO | EXPIRADO | CANCELADO.
 * Gateway: AGENDADO → timer diário → esta tarefa; demais → Arquivar.
 */
function servicetask7(attempt, message) {
  var today = hojeIso();
  var numeroProcesso = String(getValue("WKNumProces") || "");
  hAPI.setCardValue("numero_processo", numeroProcesso);

  if (estaEncerrado()) {
    definirStatus("CANCELADO");
    return;
  }

  if (estaExpirado(today)) {
    definirStatus("EXPIRADO");
    return;
  }

  if (estaAgendado(today)) {
    definirStatus("AGENDADO");
    hAPI.setCardValue("publicado", "N");
    return;
  }

  var destinatarios = resolverPublico();
  if (!destinatarios.length) {
    throw "Nenhum destinatário encontrado para o público-alvo informado (após exceções).";
  }

  var jaDisparados = parseJsonList(hAPI.getCardValue("usuarios_disparados"));
  var mapaDisparados = {};
  for (var d = 0; d < jaDisparados.length; d++) {
    mapaDisparados[String(jaDisparados[d])] = true;
  }

  var LIMITE_LOTE = 8;
  var publicados = 0;
  var erros = [];
  var restantes = 0;

  for (var i = 0; i < destinatarios.length; i++) {
    var user = destinatarios[i];
    var userCode = String(user.USER_CODE || "");
    if (!userCode || mapaDisparados[userCode]) {
      continue;
    }
    if (publicados >= LIMITE_LOTE) {
      restantes++;
      continue;
    }
    try {
      startCiencia(user, numeroProcesso);
      jaDisparados.push(userCode);
      mapaDisparados[userCode] = true;
      publicados++;
      hAPI.setCardValue("usuarios_disparados", toJson(jaDisparados));
    } catch (e) {
      erros.push(userCode + ": " + e);
      log.error("GestorConfirmarCiencia startCiencia " + userCode + ": " + e);
    }
  }

  hAPI.setCardValue("qtd_destinatarios", String(destinatarios.length));

  if (publicados === 0 && erros.length && restantes === 0 && jaDisparados.length === 0) {
    throw "Falha ao criar ciências. Primeiro erro: " + erros[0];
  }

  if (restantes > 0) {
    definirStatus("AGENDADO");
    hAPI.setCardValue("publicado", "N");
    log.info("GestorConfirmarCiencia lote: " + publicados + " disparados, " + restantes + " pendentes.");
    return;
  }

  definirStatus("ATIVO");
  hAPI.setCardValue("publicado", "S");
}

function estaEncerrado() {
  return hAPI.getCardValue("cancelado") == "S" || hAPI.getCardValue("excluido") == "S";
}

function estaExpirado(today) {
  var semExpiracao = hAPI.getCardValue("sem_data_expiracao") == "S";
  var dataFim = isoDate(hAPI.getCardValue("data_fim"));
  return !semExpiracao && dataFim && dataFim < today;
}

function estaAgendado(today) {
  var dataInicio = isoDate(hAPI.getCardValue("data_inicio"));
  return dataInicio && dataInicio > today;
}

function definirStatus(status) {
  hAPI.setCardValue("status", status);
}

function hojeIso() {
  return new java.text.SimpleDateFormat("yyyy-MM-dd").format(new java.util.Date());
}

function isoDate(value) {
  var texto = String(value || "");
  return texto.length >= 10 ? texto.substring(0, 10) : "";
}

function resolverPublico() {
  var tipo = nvl(hAPI.getCardValue("publico_tipo"), "todos");
  var mapa = {};

  if (tipo == "todos") {
    mesclarUsuarios(mapa, listarUsuariosDoGrupo(""));
  } else {
    var grupos = parseJsonList(hAPI.getCardValue("publico_grupos"));
    for (var g = 0; g < grupos.length; g++) {
      var groupId = getProp(grupos[g], "groupId");
      if (groupId) {
        mesclarUsuarios(mapa, listarUsuariosDoGrupo(groupId));
      }
    }

    var usuarios = parseJsonList(hAPI.getCardValue("publico_usuarios"));
    for (var u = 0; u < usuarios.length; u++) {
      var userCode = getProp(usuarios[u], "USER_CODE");
      if (userCode) {
        mapa[userCode] = buscarColleague(userCode, getProp(usuarios[u], "NOME"));
      }
    }
  }

  var excecaoGrupos = parseJsonList(hAPI.getCardValue("excecao_grupos"));
  for (var eg = 0; eg < excecaoGrupos.length; eg++) {
    var excGroup = getProp(excecaoGrupos[eg], "groupId");
    if (!excGroup) {
      continue;
    }
    var usuariosExcGrupo = listarUsuariosDoGrupo(excGroup);
    for (var x = 0; x < usuariosExcGrupo.length; x++) {
      delete mapa[usuariosExcGrupo[x].USER_CODE];
    }
  }

  var excecaoUsuarios = parseJsonList(hAPI.getCardValue("excecao_usuarios"));
  for (var eu = 0; eu < excecaoUsuarios.length; eu++) {
    var excUser = getProp(excecaoUsuarios[eu], "USER_CODE");
    if (excUser) {
      delete mapa[excUser];
    }
  }

  var resultado = [];
  for (var key in mapa) {
    if (mapa[key] && mapa[key].USER_CODE) {
      resultado.push(mapa[key]);
    }
  }
  return resultado;
}

function listarUsuariosDoGrupo(grupo) {
  var constraints = [];
  if (grupo) {
    constraints.push(DatasetFactory.createConstraint("GRUPO", grupo, grupo, ConstraintType.MUST));
  }

  var ds = DatasetFactory.getDataset(
    "ds_fluig_jdbc_getUsersOfGroup",
    null,
    constraints.length ? constraints : null,
    null
  );
  var users = [];
  if (ds == null || ds.rowsCount == 0) {
    return users;
  }
  try {
    var erro = ds.getValue(0, "ERRO");
    if (erro) {
      log.error("ds_fluig_jdbc_getUsersOfGroup: " + erro);
      return users;
    }
  } catch (eErro) {}

  for (var i = 0; i < ds.rowsCount; i++) {
    var userCode = ds.getValue(i, "USER_CODE");
    if (!userCode) {
      continue;
    }
    users.push({
      USER_CODE: String(userCode),
      FULL_NAME: nvl(ds.getValue(i, "NOME"), nvl(ds.getValue(i, "FULL_NAME"), String(userCode))),
      EMAIL: nvl(ds.getValue(i, "EMAIL"), ""),
    });
  }
  return users;
}

function buscarColleague(userCode, nomeFallback) {
  try {
    var c1 = DatasetFactory.createConstraint("colleaguePK.colleagueId", userCode, userCode, ConstraintType.MUST);
    var ds = DatasetFactory.getDataset("colleague", null, [c1], null);
    if (ds != null && ds.rowsCount > 0) {
      var ativo = ds.getValue(0, "active");
      if (String(ativo).toLowerCase() == "false") {
        return { USER_CODE: "", FULL_NAME: "" };
      }
      return {
        USER_CODE: String(userCode),
        FULL_NAME: nvl(ds.getValue(0, "colleagueName"), nomeFallback),
        EMAIL: nvl(ds.getValue(0, "mail"), ""),
      };
    }
  } catch (e) {
    log.error("GestorConfirmarCiencia colleague " + userCode + ": " + e);
  }
  return {
    USER_CODE: String(userCode),
    FULL_NAME: nvl(nomeFallback, userCode),
    EMAIL: "",
  };
}

function startCiencia(user, numeroProcesso) {
  var lista = new java.util.ArrayList();
  lista.add(user.USER_CODE);

  var titulo = nvl(hAPI.getCardValue("titulo"), "");
  var descricao = nvl(hAPI.getCardValue("descricao"), "");
  var agora = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new java.util.Date());

  var valores = new java.util.HashMap();
  valores.put("assunto", titulo);
  valores.put("observacao", descricao);
  valores.put("campo_descritor", "Confirmar ciência " + titulo);
  valores.put("data_solicitacao", agora);
  valores.put("usuario_matricula", user.USER_CODE);
  valores.put("usuario_nome", nvl(user.FULL_NAME, user.USER_CODE));
  valores.put("usuario_email", nvl(user.EMAIL, ""));
  valores.put("numero_processo_pai", numeroProcesso);
  valores.put("processo_origem", "COMUNICADO");
  valores.put("documentos_anexos", nvl(hAPI.getCardValue("documentos_anexos"), "[]"));
  valores.put("tipo_conteudo", nvl(hAPI.getCardValue("tipo_conteudo"), "pdf"));
  valores.put("url_conteudo", nvl(hAPI.getCardValue("url_conteudo"), ""));
  valores.put("texto_botao_acao", nvl(hAPI.getCardValue("texto_botao_acao"), "Ciente"));
  valores.put("exibir_popup", nvl(hAPI.getCardValue("exibir_popup"), "N"));

  var resposta = hAPI.startProcess("ConfirmarCiencia", 0, lista, "Comunicado institucional", true, valores, false);
  var numCiencia = extrairNumeroProcesso(resposta);
  if (numCiencia) {
    gravarNumeroNaCiencia(numCiencia, agora);
  }
}

function extrairNumeroProcesso(resposta) {
  if (resposta == null) {
    return "";
  }
  try {
    if (typeof resposta.get === "function") {
      var viaMap = resposta.get("iProcess");
      if (viaMap != null && String(viaMap) != "") {
        return String(viaMap);
      }
    }
  } catch (eMap) {}
  var texto = String(resposta);
  if (texto && texto != "undefined" && texto != "null") {
    return texto.replace(/[^0-9]/g, "");
  }
  return "";
}

function obterCardIdDoProcesso(numProces) {
  var c1 = DatasetFactory.createConstraint(
    "workflowProcessPK.processInstanceId",
    String(numProces),
    String(numProces),
    ConstraintType.MUST
  );
  var ds = DatasetFactory.getDataset("workflowProcess", null, [c1], null);
  if (ds == null || ds.rowsCount == 0) {
    return "";
  }
  var colunas = ["cardDocumentId", "documentId", "cardId"];
  for (var i = 0; i < colunas.length; i++) {
    try {
      var valor = ds.getValue(0, colunas[i]);
      if (valor != null && String(valor) != "") {
        return String(valor);
      }
    } catch (eCol) {}
  }
  return "";
}

function campoFicha(id, valor) {
  var campo = new com.fluig.sdk.api.cardindex.CardFieldVO();
  campo.setFieldId(id);
  campo.setValue(String(valor));
  return campo;
}

function gravarNumeroNaCiencia(numCiencia, agora) {
  try {
    var card = hAPI.getCardData(java.lang.Integer.parseInt(String(numCiencia)));
    if (card != null && nvl(card.get("numero_processo"), "") != "") {
      return;
    }
  } catch (eLeitura) {
    log.error("GestorConfirmarCiencia getCardData ciência " + numCiencia + ": " + eLeitura);
  }

  try {
    var cardId = obterCardIdDoProcesso(numCiencia);
    if (!cardId) {
      log.error("GestorConfirmarCiencia cardId não encontrado para ciência " + numCiencia);
      return;
    }
    var campos = new java.util.ArrayList();
    campos.add(campoFicha("numero_processo", numCiencia));
    if (agora) {
      campos.add(campoFicha("data_solicitacao", agora));
    }
    fluigAPI.getCardAPIService().edit(java.lang.Integer.parseInt(String(cardId)), campos);
  } catch (eEdit) {
    log.error("GestorConfirmarCiencia edit ciência " + numCiencia + ": " + eEdit);
  }
}

function mesclarUsuarios(mapa, lista) {
  for (var i = 0; i < lista.length; i++) {
    var user = lista[i];
    if (user && user.USER_CODE && !mapa[user.USER_CODE]) {
      mapa[user.USER_CODE] = user;
    }
  }
}

function parseJsonList(raw) {
  if (raw == null || String(raw).trim() == "" || String(raw) == "[]") {
    return [];
  }
  var list = [];
  try {
    var parsed = JSON.parse(String(raw));
    if (parsed && parsed.length != null) {
      for (var i = 0; i < parsed.length; i++) {
        list.push(parsed[i]);
      }
    }
  } catch (e) {
    log.error("GestorConfirmarCiencia parseJsonList: " + e);
  }
  return list;
}

function getProp(obj, key) {
  if (obj == null) {
    return "";
  }
  if (typeof obj.get === "function") {
    var viaGet = obj.get(key);
    if (viaGet != null && String(viaGet) != "") {
      return String(viaGet);
    }
  }
  if (obj[key] != null && String(obj[key]) != "") {
    return String(obj[key]);
  }
  return "";
}

function nvl(value, fallback) {
  return value == null || String(value) == "" ? fallback : String(value);
}

function toJson(value) {
  try {
    return JSON.stringify(value);
  } catch (e) {
    return JSONUtil.toJSON(value);
  }
}
