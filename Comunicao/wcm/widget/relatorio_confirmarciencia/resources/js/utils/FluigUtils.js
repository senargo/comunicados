class FluigUtils {
  static openUrl({ url, newWindow = false, useMobileUrl = false }) {
    let fluigProtocol = "";
    if (top.WCMAPI.isMobileAppMode() && useMobileUrl) {
      fluigProtocol = "fluig://";
    }

    window.open(`${fluigProtocol}${top.WCMAPI.serverURL}${top.WCMAPI.tenantURI}/${url}`, newWindow ? '_blank' : "_self");
  }
  
  static openDocument(docId, docVersion, cfgTitle = "Visualizador de Documentos") {
    if(!docId){
      return;
    }

    if (WCMAPI.isMobileAppMode() || window.innerWidth <= 400) {
      var mobileUrl = `${WCMAPI.getServerURL() + WCMAPI.getProtectedContextPath() + "/" + WCMAPI.getTenantCode()}/ecmnavigation?app_ecm_navigation_doc=${docId}`;
      window.open(mobileUrl, "_blank");
      return;
    }

    var parentOBJ;

    if (window.opener) {
        parentOBJ = window.opener.parent;
    } else {
        parentOBJ = parent;
    }

    var cfg = {
        url : "/ecm_documentview/documentView.ftl",
        maximized : true,
        title : cfgTitle,
        callBack : function() {
            parentOBJ.ECM.documentView.getDocument(docId, docVersion);
        },
        customButtons : []
    };
    parentOBJ.WCMC.panel(cfg);
  }

  static handleNullString(data) {
    if (data && data != "null") return data;

    return "";
  }

  static dateToString(date) {
    if (date) {
      const normalizedDate = new Date(date);
      if (normalizedDate && normalizedDate != "Invalid Date") {
        return normalizedDate.toISOString().split("T")[0].split("-").reverse().join("/");
      }
    }

    return '';
  }

  static createLoading(context = window) {
    return FLUIGC.loading(context);
  }

  static showLoading(context, callback) {
    const loading = FluigUtils.createLoading(context);
    loading.show();
    setTimeout(() => {
      callback();
      loading.hide();
    }, 300);
  }

  static getTextFromDate(data) {
    const mes = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"][data.getMonth()];
    return `${mes} de ${data.getFullYear()}`;
  }

  static parseDataFromString(data) {
    return new Date(data.split("/").reverse().join("/"));
  }

  static toast({
    message,
    type,
    isHtml,
    timer = 3000
  }) {
    if (type == 'error')
      timer = 10000;

    Swal.fire({
      icon: type,
      title: type == "error" ? "Erro:" : type == "warning" ? "Atenção:" : type == 'info' ? 'Informação' : "Sucesso:",
      [isHtml ? "html" : "text"]: message,
      timer,
    });
  }

  static toMoneyString(number) {
    return parseFloat(number).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  static confirm({
    title = "Atenção:",
    message,
    confirmFunction,
    showCancel = true,
    isHtml = false,
    defaultAction = null,
    extraActions = null,
    target = null,
    icon = 'warning',
    cancelFunction
  }) {
    Swal.fire({
      title: title,
      [isHtml ? "html" : "text"]: message,
      icon: target,
      showCancelButton: showCancel,
      target: target,
      confirmButtonText: "OK, Confirmar",
      cancelButtonText: "Cancelar",
      allowOutsideClick: false,
    }).then((result) => {
      if (result.isConfirmed) {
        confirmFunction();
      } else {
        if (cancelFunction && typeof cancelFunction == "function") cancelFunction()
      }

      if (defaultAction && typeof defaultAction == "function") {
        defaultAction();
      }
    });

    if (extraActions && typeof extraActions == "function") {
      extraActions();
    }
  }

  static initLoading(title, message, fn, miau = true) {

    //MIAU = Método Interno para Ajuste Unificado

    if (miau) {

      return Swal.fire({
        title: title,
        html: `<span id="swal2-custom-loading"></span>${message}`,
        allowEscapeKey: false,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading()
          fn()
            .then(() => $("#swal2-custom-loading").parents().eq(2).remove())
        }
      });

    } else {

      Swal.fire({
        title: title,
        html: message,
        allowEscapeKey: false,
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading()
          fn()
            .then(Swal.close)
        }
      });

    }

    /* Util.initLoading('Pera ai caceta', 'To processando', () => new Promise(resolve => setTimeout(resolve, 3000)), false) */

  }

  static obterLink(numero_processo) {
    const ATIVIDADE_FIM = 26;
    let movementSequence, processHistory, stateSequence;
    let userCode = top.WCMAPI.userCode ? top.WCMAPI.userCode : WCMAPI.userCode;

    let adminMode = false
    if (numero_processo) {
      let constraints = new Array();
      constraints.push(DatasetFactory.createConstraint("active", true, true, ConstraintType.MUST));
      constraints.push(DatasetFactory.createConstraint("processHistoryPK.processInstanceId", numero_processo, numero_processo, ConstraintType.MUST));
      let processHistory = DatasetFactory.getDataset('processHistory', null, constraints, null);


      if (processHistory && processHistory.values && processHistory.values.length) {
        movementSequence = processHistory.values[0]['processHistoryPK.movementSequence'];
        stateSequence = processHistory.values[0]['stateSequence'];
      } else {
        return 'pageworkflowview?app_ecm_workflowview_detailsProcessInstanceID=' + numero_processo;
      }
    } else {
      return null;
    }

    var dsCheckGroup = DatasetFactory.getDataset('ds_fluig_jdbc_getUsersOfGroup', null, [
      DatasetFactory.createConstraint('EMAIL', top.WCMAPI.userEmail, null, ConstraintType.MUST),
      DatasetFactory.createConstraint('GRUPO', 'S_DAF_GADM_CEDOC', null, ConstraintType.MUST)
    ])

    if(dsCheckGroup && dsCheckGroup?.values?.length > 0){
      adminMode = true;
    }
   

    let url = 'pageworkflowview?app_ecm_workflowview_processInstanceId=';
    let urlDetails = 'pageworkflowview?app_ecm_workflowview_detailsProcessInstanceID=';

    if (stateSequence === ATIVIDADE_FIM) {
      return `${url}${numero_processo}`;
    } else if (stateSequence != ATIVIDADE_FIM && adminMode === false) {
      return `${urlDetails}${numero_processo}`;
    } else {
      return `${url}${numero_processo}&app_ecm_workflowview_currentMovto=${movementSequence}&app_ecm_workflowview_managerMode=${adminMode}`;
    }
  }

  static mask(selector, mask) {
    $(selector).inputmask({
      mask: typeof mask == "object" ? [...mask] : [mask],
      keepStatic: true,
    });
  }

  static maskTelefone(telefone) {
    if (telefone) {
      const value = telefone.replace(/\D/g, "");
      if (value.length <= 10)
        return value
          .replace(/(\d{2})(\d)/, "($1) $2")
          .replace(/(\d{4})(\d)/, "$1-$2")
          .replace(/(\d{4})\d+?$/, "$1");
      else
        return value
          .replace(/(\d{2})(\d)/, "($1) $2")
          .replace(/(\d{5})(\d)/, "$1-$2")
          .replace(/(\d{4})\d+?$/, "$1");
    } else {
      return "";
    }
  }

  static maskCpf(cpf) {
    const value = cpf?.replace(/\D/g, "") || '';
    return value
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1-$2")
      .replace(/(\d{2})\d+?$/, "$1");
  }

  static unmask(text) {
    return text?.replace(/\D/g, "") || '';
  }

  static criaElementoXML(elemento, data) {
    return `<${elemento}>${data}</${elemento}>`;
  }

  static showProgressBar(title, messsage) {
    const loading = FLUIGC.loading(window);

    const structSaving = `
            <div class='row'>
                <div class='col-xs-12 col-md-12'>
                    <div class="progress">
                        <div class="progress-bar progress-bar-info" id='progBarSave' role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%;">
                            <span id='curSavingStat'></span>
                        </div>
                    </div>
                </div>
            </div>
        `;

    const modalProgSave = FLUIGC.modal({
      title: title,
      content: structSaving,
      id: "modalLot",
      size: "large",
    },
      (err, data) => {
        if (err) {
          $("#modalLot").find("button.close").remove();
          console.error("Erro ao carregar o modal");
          consolel.error(err);

          Util.launchToast({
            title: "Erro ao carregar o modal de progress bar: ",
            message: err,
            type: "danger",
          });
        } else {
          loading.show();

          $("#curSavingStat").text(messsage);
          $("#progBarSave").attr("aria-valuenow", 1);
          $("#progBarSave").width("1%");
        }
      }
    );

    return modalProgSave;
  }

  static updateProgressBar(message, percent) {
    $("#curSavingStat").text(message);
    $("#progBarSave").attr("aria-valuenow", percent);
    $("#progBarSave").width(`${percent}%`);
  }

  static closeProgressBar(progressBar) {
    progressBar.remove();
    FLUIGC.loading(window).hide();
  }

  static async restCall({
    special = false,
    method,
    json = null,
    url
  }) {
    let parms;

    if (special) {
      parms = {
        method: method,
        body: json,
        processData: false,
      };
    } else if (json) {
      parms = {
        method: method,
        body: JSON.stringify(json),
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      };
    } else {
      parms = {
        method: method,
      };
    }

    return fetch(url, parms)
      .then(async (response) => {
        return {
          response: await response.json(),
          status: response.status,
          statusText: response.statusText,
        };
      })
      .then((result) => result)
      .catch((err) => err);
  }

  static async restDatasetCall({
    url,
    method,
    json = null,
    processResult = false
  }) {
    const jsonData = {
      name: "ds_rest_sisateg_api",
      fields: null,
      constraints: [{
        _field: "endpoint",
        _initialValue: url,
        _finalValue: url,
        _type: 1,
        _likeSearch: false,
      },
      {
        _field: "method",
        _initialValue: method,
        _finalValue: method,
        _type: 1,
        _likeSearch: false,
      },
      ],
    };

    if (json)
      jsonData.constraints.push({
        _field: "params",
        _initialValue: JSON.stringify(json),
        _finalValue: JSON.stringify(json),
        _type: 1,
        _likeSearch: false,
      });

    if (processResult)
      jsonData.constraints.push({
        _field: "processResult",
        _initialValue: "s",
        _finalValue: "s",
        _type: 1,
        _likeSearch: false,
      });

    const data = await FluigUtils.restCall({
      url: "/api/public/ecm/dataset/datasets",
      method: "post",
      json: jsonData,
    });

    if (data.status == 200) {
      if (processResult) return data.response.content.values;
      else {
        if (data.response.content.values[0].SUCESSO) {
          const json = JSON.parse(data.response.content.values[0].SUCESSO);
          if (json) {
            return json;
          }
        }
      }
    }

    throw "Ocorreu um erro ao consultar o dataset. Se o problema persistir, contate a TI.";
  }

  static closeModal(id) {
    $(`#${id}`).find('button.close[data-dismiss="modal"]').trigger('click')
  }


  static async genericRestDatasetCall({ dataset, fields = null, constraints = null }) {
    const jsonData = {
      name: dataset,
      fields: fields,
      constraints: constraints
        ? Object.keys(constraints).map((key) => ({
          _field: key,
          _initialValue: constraints[key],
          _finalValue: constraints[key],
          _type: 1,
          _likeSearch: false,
        }))
        : null,
    };

    const data = await FluigUtils.restCall({
      url: "/api/public/ecm/dataset/datasets",
      method: "post",
      json: jsonData,
    });

    if (data.status == 200) {
      if (data.response.content && data.response.content.values) {
        return data.response.content.values;
      }
    }

    throw "Ocorreu um erro ao consultar o dataset. Se o problema persistir, contate a TI.";
  }

  
  static async genericRestDatasetCallV2({ dataset, fields = null, constraints = null }) {
    const jsonData = {
      name: dataset,
      fields: fields,
      constraints: constraints
        ? Object.keys(constraints).map((key) => ({
            _field: key,
            _initialValue: constraints[key].initialValue,
            _finalValue: constraints[key].finalValue || constraints[key].initialValue,
            _type: constraints[key].type || 1,
            _likeSearch: constraints[key].likeSearch || false,
          }))
        : null,
    };

    const data = await FluigUtils.restCall({
      url: "/api/public/ecm/dataset/datasets",
      method: "post",
      json: jsonData,
    });

    if (data.status == 200) {
      if (data.response.content && data.response.content.values) {
        return data.response.content.values;
      }
    }

    throw "Ocorreu um erro ao consultar o dataset. Se o problema persistir, contate a TI.";
  }

  static initJqueryDatatable(id) {
    $(id).DataTable({
      responsive: true,
      language: {
        lengthMenu: "Mostrando _MENU_ registros por página.",
        zeroRecords: "Nenhum registro encontrado.",
        info: "Página _PAGE_ de _PAGES_",
        infoEmpty: "Sem registros.",
        infoFiltered: "(Filtrando de _MAX_ registros.)",
        search: "Pesquisar:",
        paginate: {
          next: "Próximo",
          previous: "Anterior",
          first: "Primeiro",
          last: "Último",
        },
      },
    });
  }

  static initNav(idNav) {
    $(`ul${idNav}.nav a`).click((el) => {
      el.preventDefault();
      const elemento = $(el.currentTarget);
      const href = $(elemento).attr("href");
      if (!$(elemento).parent().hasClass("active")) {
        const old = $("li.active").find("a").attr("href");
        $(`#${old}`).hide();
        $(`#${href}`).show();

        $("li.active").removeClass("active");
        $(elemento).parent().addClass("active");
      }
    });

    $(`ul${idNav}.nav a`).not(':first').each((id, el) => {
      const elemento = $(el);
      const href = $(elemento).attr("href");
      $(`#${href}`).hide()
    })
  }
}

/*

await FluigUtils.restDatasetCall({
        url: '/api/tecnico/rm',
        method: 'GET',
        processResult: false
})

*/