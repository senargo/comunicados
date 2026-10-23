function createDataset(fields, constraints, sortFields) {
  var newDataset = DatasetBuilder.newDataset();
  var dataSource = "/jdbc/AppDS";
  var ic = new javax.naming.InitialContext();
  var ds = ic.lookup(dataSource);
  var conn = null;
  var stmt = null;
  var created = false;

  var isProd = fluigAPI.getPageService().getServerURL().indexOf("fluigteste") != -1 ? false : true;
  var formCorporeRM = isProd ? "CorporeRM_Senar" : "CorporeRM_Teste";
  var formConfirmarCiencia = isProd ? "ML00115876" : "ML00112636";

  var assunto = "";
  var observacao = "";
  var nrdocumento = "";
  var data_inicial = "";
  var data_final = "";
  var num_seq_estado = "";
  var user_code = "";

  if (constraints != null) {
    for (var c = 0; c < constraints.length; c++) {
      if (constraints[c].fieldName.toLowerCase() == 'assunto') {
        assunto = constraints[c].initialValue;
      } else if (constraints[c].fieldName.toLowerCase() == 'observacao') {
        observacao = constraints[c].initialValue;
      } else if (constraints[c].fieldName.toLowerCase() == 'numerodocumento') {
        nrdocumento = constraints[c].initialValue;
      } else if(constraints[c].fieldName.toLowerCase() == 'data_solicitacao') {
        data_inicial = constraints[c].initialValue;
        data_final = constraints[c].finalValue;
      } else if(constraints[c].fieldName.toLowerCase() == 'data_inicial') {
        data_inicial = constraints[c].initialValue;
      } else if(constraints[c].fieldName.toLowerCase() == 'data_final') {
        data_final = constraints[c].initialValue;
      } else if(constraints[c].fieldName.toLowerCase() == 'num_seq_estado') {
        num_seq_estado = constraints[c].initialValue;
      } else if(constraints[c].fieldName.toLowerCase() == 'user_code') {
        user_code = constraints[c].initialValue;
      }
    }
  }

  try {
    var sql =
      " " +
      "   SELECT TOP 2000 U.FULL_NAME,   "+
      "   	ML.ASSUNTO, ML.CAMPO_DESCRITOR , ML.NUMERO_PROCESSO, ML.NUMERO_PROCESSO_PAI, ML.PROCESSO_ORIGEM,  "+
      "   	ML.OBSERVACAO, 	ML.DOCUMENTOS_ANEXOS ,  "+
      "   	ML.DATA_CIENCIA, ML.DATA_SOLICITACAO , USUARIO_MATRICULA, PROC_HIST.* "+
      "   FROM "+ formConfirmarCiencia + " ML  "+
      "   	JOIN DOCUMENTO D  "+
      "   		ON D.NR_DOCUMENTO = ML.DOCUMENTID   "+
      "   			AND D.NR_VERSAO = ML.VERSION  "+
      "   			AND D.VERSAO_ATIVA = 1  "+
      "   	JOIN FDN_USERTENANT FU  "+
      "   		ON FU.USER_CODE = ML.USUARIO_MATRICULA  "+
      "   	JOIN FDN_USER U "+
      "   		ON U.USER_ID = FU.USER_ID "+
      "   	OUTER APPLY (     "+
      "         SELECT TOP 1 PW.NUM_PROCES, PW.CLOSURE_STATUS,      "+
      "           STATUS, CHOOSE(PW.STATUS + 1, 'ANDAMENTO', 'CANCELADO', 'FINALIZADO') DESCRICAO_STATUS,     "+
      "           EP.NOM_ESTADO , HP.NUM_SEQ_ESTADO, HP.MOVTO_DATE_TIME,      "+
      "           CONVERT(VARCHAR, HP.MOVTO_DATE_TIME, 103) MOVTO_DATE_FORMATED,    "+
      "           CONVERT(VARCHAR, HP.MOVTO_DATE_TIME, 108) MOVTO_TIME_FORMATED     "+
      "         FROM FLUIG.DBO.PROCES_WORKFLOW PW     "+
      "           JOIN FLUIG.DBO.HISTOR_PROCES HP     "+
      "             ON HP.NUM_PROCES = PW.NUM_PROCES      "+
      "           JOIN FLUIG.DBO.ESTADO_PROCES EP     "+
      "             ON EP.NUM_SEQ = HP.NUM_SEQ_ESTADO       "+
      "               AND EP.COD_DEF_PROCES = PW.COD_DEF_PROCES     "+
      "               AND EP.NUM_VERS = PW.NUM_VERS     "+
      "       WHERE PW.NUM_PROCES = ML.NUMERO_PROCESSO      "+
      "       ORDER BY HP.MOVTO_DATE_TIME DESC      "+
      "     ) AS PROC_HIST  "+
      "  WHERE (ML.ASSUNTO LIKE ? OR ? = '') "+
      "     AND (ML.OBSERVACAO LIKE ? OR ? = '')  "+
      "     AND (ML.DATA_SOLICITACAO BETWEEN ? AND ? OR ? = '')  "+
      "     AND (ML.DOCUMENTOS_ANEXOS like ? OR ? = '')  "+
      "     AND (PROC_HIST.NUM_SEQ_ESTADO = ? OR ? = '')  "+
      "     AND (ML.USUARIO_MATRICULA = ? OR ? = '')  ";

    var conn = ds.getConnection();
    
    var stmt = conn.prepareStatement(sql);
    
    var i = 1;
    stmt.setString(i++, '%' + assunto + '%'); stmt.setString(i++, '%' + assunto + '%');
    stmt.setString(i++, '%' + observacao + '%'); stmt.setString(i++, '%' + observacao + '%');
    stmt.setString(i++, data_inicial); stmt.setString(i++, data_final); stmt.setString(i++, data_inicial);
    stmt.setString(i++, "%" + nrdocumento + "%"); stmt.setString(i++, nrdocumento);
    stmt.setString(i++, num_seq_estado); stmt.setString(i++, num_seq_estado);
    stmt.setString(i++, user_code); stmt.setString(i++, user_code);

    var rs = stmt.executeQuery();
    var columnCount = rs.getMetaData().getColumnCount();

    while (rs.next()) {
      if (!created) {
        for (var iCol = 1; iCol <= columnCount; iCol++) {
          newDataset.addColumn(rs.getMetaData().getColumnName(iCol).toUpperCase());
        }
        created = true;
      }

      var arr = [];
      for (var iCol = 1; iCol <= columnCount; iCol++) {
        var obj = rs.getObject(iCol);
        arr.push(obj != null ? obj.toString() : null);
      }
      newDataset.addRow(arr);
    }
  } catch (e) {
    newDataset.addColumn("ERRO");
    newDataset.addColumn("LINHA");
    newDataset.addRow([e.toString(), e.lineNumber ? e.lineNumber.toString() : ""]);
  } finally {
    if (stmt != null) stmt.close();
    if (conn != null) conn.close();
  }

  return newDataset;
}
