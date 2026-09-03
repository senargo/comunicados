class LipekeUtils {

    static initAutocomplete(label, id, data, placeholder = '') {

        const html = `
            <i class="flaticon flaticon-search icon-sm lipeke-leButton" aria-hidden="true"></i>
            <input id="${id}">
            <label for="${id}" placeholder='${placeholder}'>${label}</label>
        `

        $('#' + id).parent().append(html);
        $('div#' + id).remove();

        $('#' + id).css('width', '100%');

        $("#" + id).autocomplete({
            source: data
        });

        const auto = $("#" + id)[0]
        const selecionado = auto[Object.keys(auto)[0]]
        const menu = selecionado.uiAutocomplete.bindings[1].id;

        $('#' + menu).css('max-height', '300px');
        $('#' + menu).css('overflow-x', 'auto');

        $("#" + id).parent().find('i').on('click', (el) => {
            if ($('#' + menu).css('display') == 'none') {
                $("#" + id).autocomplete("option", "minLength", 0);
                $("#" + id).autocomplete("search", "");
                const pos = $("#" + id).offset().top;
                $('#' + menu).css('top', pos + 50 + 'px');
                $("#" + id).autocomplete("option", "minLength", 1);
            } else {
                $('#' + id).autocomplete( "close" );
            }
        })

    }

    static initAutocompleteDs({label, isRequired, id, placeholder = '', addSearchIcon, fetchParams, onAdd, onRemove,}) {

        const html = `
            ${addSearchIcon ? '<i class="flaticon flaticon-search icon-sm lipeke-leButton" style="width: 5%" aria-hidden="true"></i>' : ''}
            <input id="${id}">
            <label for="${id}" placeholder='${placeholder}' ${isRequired? 'class="required"' : ''}>${label}</label>
        `

        const onFetch = async (name = '') => {
            return await LipekeUtils.zoomCall({
                datasetId: fetchParams.dataset,
                searchField: fetchParams.searchField,
                resultFields: fetchParams.resultFields,
                filterFields: typeof fetchParams.filterFields == 'function'? fetchParams.filterFields() : fetchParams.filterFields
            })
            .then((data) => (data.length ? data : []))
            .then(data => {
                data.forEach((el, idx) => {
                    data[idx]['label'] = el[fetchParams.label];
                })
                return data;
            })
        }

        $('#' + id).parent().append(html);
        $('div#' + id).remove();

        if (addSearchIcon) $('#' + id).css('width', addSearchIcon? '95%' : '100%');

        $("#" + id).autocomplete({
            source: []
        });

        const auto = $("#" + id)[0]
        const selecionado = auto[Object.keys(auto)[0]]
        const menu = selecionado.uiAutocomplete.bindings[1].id;

        const parent = $("#" + id).parent();
        const loadFeiao = FLUIGC.loading(parent);

        $('#' + menu).css('max-height', '300px');
        $('#' + menu).css('overflow-y', 'auto');

        if (addSearchIcon) {
            $("#" + id).parent().find('i').on('click', async (el) => {
                
                loadFeiao.show();
                let data = await onFetch('');
                    //data = data.message
                loadFeiao.hide();

                $("#" + id).autocomplete({
                    source: data
                });
                if ($('#' + menu).css('display') == 'none') {
                    $("#" + id).autocomplete("option", "minLength", 0);
                    $("#" + id).autocomplete("search", "");
                    const pos = $("#" + id).offset().top;
                    $('#' + menu).css('top', pos + 50 + 'px');
                    $("#" + id).autocomplete("option", "minLength", 1);
                } else {
                    $('#' + id).autocomplete( "close" );
                }
            })
        }

        $("#" + id).on('keyup', async () => {

            const val = $("#" + id).val();
            const size = val.length;
        
            if (size > 0) {
                
                loadFeiao.show();
                let data = await onFetch(val);
                loadFeiao.hide();
                
                $("#" + id).autocomplete({
                    source: data
                });
            }
            
        })

        if(onAdd && typeof onAdd == 'function'){
            $("#" + id).on("autocompleteselect", (event, ui) => {
            onAdd(ui.item)
            });
        }

        if(onRemove && typeof onRemove == 'function'){
            $("#" + id).on('change', (el) => {
                const text = $(el.currentTarget).val()
                if(!text)
                    onRemove()
            })
        }
    }

    static async zoomCall({searchField, datasetId, filterFields = [], resultFields = []}){
        const param = {
          searchField: searchField,
          resultFields: resultFields,
          filterFields: filterFields,
          datasetId: datasetId
       }
       
       return await fetch(`${top.WCMAPI.serverURL}/ecm/api/rest/ecm/dataset/datasetZoom/${encodeURIComponent(JSON.stringify(param))}`)
            .then(data => data.json())
            .then(data => data.content)
      }

}