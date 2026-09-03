function getUsuario() {

	var user = getValue("WKUser");
	if(user == 'df48c9fdc01d4defb19ec9e389d71973'){
		return {   
			nome: 'KHYQUER RONALDY (TESTE)',
			email: 'diogo.pessoa@senar-go.com.br',
			userCode: '3a501001b8da4d898647e984de8c4aad',
			codigo: '2508'
		} 
	}

	var c1          = DatasetFactory.createConstraint("user_code", user, user, ConstraintType.MUST);
	var datasetUser = DatasetFactory.getDataset("rm_ppessoa_jdbc", null, [ c1 ], null);
	
	if (datasetUser.rowsCount == 1) {
      return {   
        nome: datasetUser.getValue(0, "NOME"),
        email: datasetUser.getValue(0, "EMAIL"),
        userCode: datasetUser.getValue(0, "USER_CODE"),
        codigo: datasetUser.getValue(0, "CODIGO")
      } 
	}
	
	return {   
		nome: null,
		email: null,
		userCode: null,
		codigo: null,
	} 
}


function afterLogin(login) {
  var user = getValue("WKUser");
  var c1 = DatasetFactory.createConstraint("FLUIG_FUNC", user, user, ConstraintType.MUST);
  var datasetUser = DatasetFactory.getDataset("rmSql_funcionarioGestorGerenteSenar", null, [c1], null);
  if (datasetUser.rowsCount == 1) {
    var user = {
      NOME: datasetUser.getValue(0, "NOME_FUNC"),
      EMAIL: datasetUser.getValue(0, "EMAIL_FUNC"),
      CODE: datasetUser.getValue(0, "FLUIG_FUNC"),
      CODIGO: datasetUser.getValue(0, "COD_FUNC"),
      FUNCAO: datasetUser.getValue(0, "FUNCAO"),
      COD_EQUIPE: datasetUser.getValue(0, "COD_EQUIPE"),
      DESC_EQUIPE: datasetUser.getValue(0, "DESC_EQUIPE"),
    };
    
    globalVars.put(user, JSONUtil.toJSON(user));
  }
}


// function beforeLogin(login) {
// 	var user = getValue("WKUser");
	
// 	var c1          = DatasetFactory.createConstraint("user_code", user, user, ConstraintType.MUST);
// 	var resultPessoa = DatasetFactory.getDataset("rm_ppessoa_jdbc", null, [ c1 ], null);
	
// 	throw "Seu e-mail ainda não tá vinculado aos usuários do Fluig. Favor acionar o suporte.";
// 	if(resultPessoa & resultPessoa.values.length >= 1){
// 		log.info("Tem cadastro");
// 		return true;
// 	} else {
// 		throw "Seu e-mail ainda não tá vinculado aos usuários do Fluig. Favor acionar o suporte.";
// 	}
// }

// var user = getValue("WKUser");
//   var c1 = DatasetFactory.createConstraint("FLUIG_FUNC", user, user, ConstraintType.MUST);
//   var datasetUser = DatasetFactory.getDataset("rmSql_funcionarioGestorGerenteSenar", null, [c1], null);
//   if (datasetUser.rowsCount == 1) {
//     var user = {
//       NOME: datasetUser.getValue(0, "NOME_FUNC"),
//       EMAIL: datasetUser.getValue(0, "EMAIL_FUNC"),
//       CODE: datasetUser.getValue(0, "FLUIG_FUNC"),
//       CODIGO: datasetUser.getValue(0, "COD_FUNC"),
//       FUNCAO: datasetUser.getValue(0, "FUNCAO"),
//       COD_EQUIPE: datasetUser.getValue(0, "COD_EQUIPE"),
//       DESC_EQUIPE: datasetUser.getValue(0, "DESC_EQUIPE"),
//     };
    
//     globalVars.put(user, JSONUtil.toJSON(user));
//   }