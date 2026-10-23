function displayFields(form,customHTML){
  var dsForm = 'protocolo_senar';

	var documentos_anexosValue = form.getValue('documentos_anexos');
	var anexosParse = [];
	try {
		anexosParse = JSON.parse(documentos_anexosValue || "[]");
	} catch (eAnexos) {
		anexosParse = [];
	}

	if (anexosParse.length > 0 && anexosParse[0].documentId) {
		anexosParse[0].documentUrl = fluigAPI.getDocumentService().getDownloadURL(anexosParse[0].documentId);
	} else {
		anexosParse = [{ documentId: "", documentDescription: "", documentUrl: "" }];
	}

	var atividadeAtual = getValue("WKNumState");

	var { nome, email, colleagueId, codigo } = getUsuario();

	var ATIVIDADE_NOVO = 0;
	var ATIVIDADE_INICIO = 4;
	var ATIVIDADE_ANALISAR = 5;
	var ATIVIDADE_CORRIGIR = 13;
	var ATIVIDADE_TRAMITAR = 18;
	var ATIVIDADE_CEDOC = 22;
	var ATIVIDADE_REVISAOFINAL = 24;
	var ATIVIDADE_FIM = 26;

	var IS_INICIAL = atividadeAtual == ATIVIDADE_NOVO || atividadeAtual == ATIVIDADE_INICIO || atividadeAtual == ATIVIDADE_CORRIGIR;

	customHTML.append("<script>\n");
	customHTML.append(" var TIPO_CONTEUDO = " + JSONUtil.stringify(String(form.getValue("tipo_conteudo") || "pdf")) + ";\n");
	customHTML.append(" var URL_CONTEUDO = " + JSONUtil.stringify(String(form.getValue("url_conteudo") || "")) + ";\n");
	customHTML.append(" var TEXTO_BOTAO_ACAO = " + JSONUtil.stringify(String(form.getValue("texto_botao_acao") || "Ciente")) + ";\n");
	customHTML.append(" var EXIBIR_POPUP = " + JSONUtil.stringify(String(form.getValue("exibir_popup") || "N")) + ";\n");
	customHTML.append(" var DOCUMENTOS_ANEXOS = " + JSONUtil.stringify(anexosParse[0]) + ";\n" +
	" const ATIVIDADE_NOVO = "+ ATIVIDADE_NOVO +";\n" +
	" const ATIVIDADE_INICIO = "+ATIVIDADE_INICIO+";\n" +
	" const ATIVIDADE_ANALISAR = "+ATIVIDADE_ANALISAR+";\n" +
	" const ATIVIDADE_CORRIGIR  = "+ATIVIDADE_CORRIGIR +";\n" +
	" const ATIVIDADE_TRAMITAR = "+ATIVIDADE_TRAMITAR+";\n" +
	" const ATIVIDADE_CEDOC = "+ATIVIDADE_CEDOC+";\n" +
	" const ATIVIDADE_REVISAOFINAL = "+ATIVIDADE_REVISAOFINAL+";\n" +
	" const IS_INICIAL = "+IS_INICIAL+";\n" +
	" const ATIVIDADE_FIM = "+ATIVIDADE_FIM+";\n" +
	"		class CurrentProcess{\n" +
		"  constructor(){\n" +
		"    this.atividadeAtual = "+atividadeAtual+";\n" +
		"    this.processo = "+getValue("WKNumProces")+";\n" +
		"    this.versao = '"+ getValue("WKVersDef")+"';\n" +
		"    this.user = '"+getValue("WKUser") +"';\n" +
		"    this.isMobile = "+getValue("WKMobile")+";\n" +
		"    this.managerMode = "+getValue("WKManagerMode")+";\n" +
		"    this.replacement = '"+getValue("WKReplacement")+"';\n" +
		"    this.formMode = '"+form.getFormMode()+"';\n" +
		"    this.dsForm = '"+dsForm+"';\n" +
		"    this.nome = '"+nome+"';\n" +
		"    this.email = '"+email+"';\n" +
		"    this.colleagueId = '"+colleagueId+"';\n" +
		"    this.codigo = '"+codigo+"';\n" +
		"  }\n" +
		"}\n" +
		"const currentProcess = new CurrentProcess();"+
		"var formMode = '"+form.getFormMode()+"';\n" 
	);
	customHTML.append("</script>");

	var numProces = getValue("WKNumProces");
	if (numProces && !form.getValue("numero_processo")) {
		form.setValue("numero_processo", String(numProces));
	}

	if (!form.getValue("data_solicitacao")) {
		var sdtf = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
		form.setValue("data_solicitacao", sdtf.format(new java.util.Date()));
	}

	if (!form.getValue("campo_descritor") && form.getValue("assunto")) {
		form.setValue("campo_descritor", "Confirmar ciência " + form.getValue("assunto"));
	}

}