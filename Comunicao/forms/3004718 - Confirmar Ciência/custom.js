var adobeDCView;

window.onload = function () {
  top.$('#tab-attachments').remove();
  adobeDCView.previewFile({
    content: {
      location: {
        url: DOCUMENTOS_ANEXOS.documentUrl,
      },
    },
    metaData: {
      fileName: DOCUMENTOS_ANEXOS.documentDescription,
    },
  }, {
    enableSaveApi: false,
  });
};

document.addEventListener("DOMContentLoaded", async (event) => {
  var parentOBJ;

  if (window.opener) {
    parentOBJ = window.opener.parent;
  } else {
    parentOBJ = parent;
  }
});
