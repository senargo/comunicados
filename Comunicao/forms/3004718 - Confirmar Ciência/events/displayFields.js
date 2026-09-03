function displayFields(form,customHTML){
  var dsForm = 'protocolo_senar';

	var documentos_anexosValue = form.getValue('documentos_anexos');
	var anexosParse = JSON.parse(documentos_anexosValue);

	var fileName = anexosParse[0].documentDescription;
	var documentId = anexosParse[0].documentId;

	var documentUrl = fluigAPI.getDocumentService().getDownloadURL(documentId);

	anexosParse[0].documentUrl = documentUrl;

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

	if (IS_INICIAL) {

		var sdtf = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
		var sdf = new java.text.SimpleDateFormat("yyyy-MM-dd");
		form.setValue("data_solicitacao", sdtf.format(new java.util.Date()));
		
		form.setValue("nome_solicitante", nome);
		form.setValue("codigo_solicitante", codigo);
		form.setValue("email_solicitante", email);
		form.setValue("matricula_solicitante", 'df48c9fdc01d4defb19ec9e389d71973');
		form.setValue("usuario_matricula", 'df48c9fdc01d4defb19ec9e389d71973');
	}



}