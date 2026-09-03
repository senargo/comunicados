class AppController {
  constructor() {
    this.view = new AppView({ controller: this });
    this.email = top.WCMAPI.userEmail;
    this.userData = {};
    this.debugGroups = [
      {
        desc: "Recursos Humanos",
        groupKey: "recursoshumanos",
        groups: ["recursoshumanos"],
      },
      {
        desc: "Colaboradores",
        groupKey: "mobilizador",
        groups: ["mobilizador"],
      },
    ];
    this.debugModeOptions = {
      // Solicitantes Processos
      recursoshumanos: {
        optionName: "Recursos Humanos",
        debugDataset: "ds_fluig_jdbc_getUsersOfGroup",
        permission: "recursoshumanos",
        debugDatasetFilter: {
          filter: ["GRUPO", "S_DAF_GRH"],
          label: 'NOME',
          search: "NOME",
          result: ["EMAIL", "NOME"],
        },
      },
      // coordenacaoRegional: {
      //   optionName: "Coordenação Regional",
      //   debugDataset: "ds_fluig_jdbc_getUsersOfGroup",
      //   permission: "coordenacaoRegional",
      //   debugDatasetFilter: {
      //     filter: ["GRUPO", "S_ACORP_REG_COORDENADORES"],
      //     label: 'NOME',
      //     search: "NOME",
      //     result: ["EMAIL", "NOME"],
      //   },
      // },
    };
    this.debugData = null;
    this.facade();
  }

  async facade() {
    await this.getColleagueId();
    const isTI = await this.checkTI();
    if (isTI?.length) {
      const debugMode = await this.view.getDebugMode();
      if (debugMode) {
        const emailSelected = await this.view.showDebug({
          text: this.debugModeOptions[debugMode].optionName,
          dataset: this.debugModeOptions[debugMode].debugDataset,
          filters: this.debugModeOptions[debugMode].debugDatasetFilter || [],
        });
        this.email = emailSelected;
        await this.getColleagueId();

        if (emailSelected) {
          return this.handleInject({
            [this.debugModeOptions[debugMode].permission]: true,
          });
        }
      }
    }

    await this.getUserData();

    const permissions = await this.loadPermission();
    return this.handleInject(permissions);
  }

  async loadPermission() {
    return new Promise((resolve) => {
      FluigUtils.initLoading(
        "Aguarde.",
        "Validando permissões...",
        async () => {
          const [groups] = await Promise.all([
            FluigUtils.genericRestDatasetCall({
              dataset: "ds_fluig_jdbc_getUsersOfGroup",
              constraints: {
                EMAIL: this.email,
              },
            })
          ]);

          const permissions = {
            recursoshumanos: groups.some((el) => el.GRUPO == "S_DAF_GRH"),
            colaboradores: groups.some((el) => el.GRUPO == "SENAR"),
            instrutores: groups.some((el) => el.GRUPO == "MEMBER_Instrutores"),
            isTI: false,
          };

          resolve(permissions);
        },
        true
      );
    });
  }

  async handleInject(permissions) {
    const permissionEnabled = Object.keys(permissions)
      .map((key) => ({
        permission: key,
        enabled: permissions[key],
      }))
      .filter((el) => el.permission != "isTI")
      .filter((el) => el.enabled);

    if (permissions.recursoshumanos) {
      this.injectPanel(
        "Recursos Humanos",
        () =>
          new RecursosHumanosController({
            email: this.email,
            colleagueId: this.colleagueId,
          })
      );
    } else if (permissions.colaboradores) {
      this.injectPanel(
        "Colaboradores",
        () =>
          new ColaboradoresController({
            email: this.email,
            colleagueId: this.colleagueId,
          })
      );
    } else if (permissions.mobilizador) {
      this.injectPanel(
        "Mobilizador",
        () =>
          new MobilizadorController({
            email: this.email,
            colleagueId: this.colleagueId,
          })
      );
    } else if (permissions.coordenacaoRegional) {
      this.injectPanel(
        "Coordenacao Regional",
        () =>
          new BaseController({
            email: this.email,
            colleagueId: this.colleagueId,
          })
      );
    } else {
      this.injectPanel("Protocolo Senar", () => {
        $("#content-inject").html(this.view.getNoPermissionView());
      });
    }
  }

  injectPanel(title, inject) {
    document.title += ` - ${title}`;
    $("#menu").remove();
    $("h2.pageTitle").text(title);
    $("#widget_content").html(AppView.getDefaultSystemView(title));
    inject();

    $(document).find("body").css("overflow", "scroll");
  }

  async getColleagueId() {
    const colleague = await FluigUtils.genericRestDatasetCall({
      dataset: "colleague",
      constraints: {
        mail: this.email,
      },
    });

    this.colleagueId = colleague?.[0]?.["colleaguePK.colleagueId"];
  }

  async getUserData() {
    const userData = await FluigUtils.genericRestDatasetCall({
      dataset: "rm_ppessoa_jdbc",
      constraints: {
        email: this.email,
      },
    });
    this.userData = userData?.[0];
  }

  async checkTI() {
    const isTI = await FluigUtils.genericRestDatasetCall({
      dataset: "colleagueGroup",
      constraints: {
        colleagueId: this.colleagueId,
        groupId: "grupoTI",
      },
    });

    return isTI;
  }
}
