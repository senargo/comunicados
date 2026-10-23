$(function () {
  $("[data-flag]").each(function () {
    var flag = $(this).attr("data-flag");
    var hidden = $("#" + flag);
    $(this).prop("checked", hidden.val() === "S");
  });

  $("[data-flag]").on("change", function () {
    var flag = $(this).attr("data-flag");
    $("#" + flag).val(this.checked ? "S" : "N");
  });

  $("#titulo").on("input", function () {
    $("#campo_descritor").val("Comunicado " + ($(this).val() || ""));
  });
});
