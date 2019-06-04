if ( req.resourceName != "_fromJira" ) {
    return;
}

var schema_type = row.getParent('jira_field_def') && row.getParent('jira_field_def').schema_type || "";
if (schema_type.toLowerCase() !== "wiki"){
    log.debug("toHtml: field_def is not wiki " + row.getParent('jira_field_def').name + " (" + row.getParent('jira_field_def').schema_type + ")");
    return;
}

var wikiText = row.user_value,
    system_ident = row.getParent('jira_object').system_ident;

if (logicContext.getVerb().toUpperCase() == "UPDATE" && oldRow ) {
    // we always store user_value and it's possible that system value isn't being set before we run this particular rule
    // so compare the old system value to the new user value (because the system_value is the last time we set wiki and
    // briefly the new user_value is wiki that we might or might not want to turn into html)
    var old_value = oldRow.system_value;
    var new_value = row.user_value;
    if ( old_value === new_value || old_value === row.system_value) {
        log.debug("toHtml: wiki value didn't change for " + row.getParent('jira_field_def').name);
        row.user_value = oldRow.user_value;
        row.last_updated = oldRow.last_updated;
        return;
    }
}
// for wiki fields, we want system value to hold wiki text and user_value to hold html
row.system_value = wikiText;

if ( ! wikiText || _.isEmpty(wikiText) ) {
    log.info("wiki to Html - wikiText is empty.");
    return;
}

var sysfilter = {sysfilter: "equal(ident:" + parseInt(system_ident) + ")"},
    system = SysUtility.getResource('system', sysfilter);


if (!system){
    throw ("system not found: " + system_ident);
}
//system = system[0];


// images to be stubbed in Rally because we don't have a full url (text orig copied from Jira)
// need to replace
wikiText = wikiText.replace(/\!(.*?)\!/gi, function(match,capture){
    // capture is from inside parens, match is whole thing
    if ( /^http/.test(capture) ) {
        return match ;
    }

    return "Image available in Jira (" + capture + ")";
});

var renderUrl = system.url + '/rest/api/1.0/render';

var payload = {
    "rendererType":"atlassian-wiki-renderer",
    "unrenderedMarkup":wikiText
};


var headers = SysUtility.getFunction('getAuthHeaders',{system: system_ident});
headers = JSON.parse(headers);

var htmlText = "";
log.info("toHtml: " + row.getParent('jira_field_def').name  + " - Calling to Jira for wiki translation at " + renderUrl);
try {
    htmlText = SysUtility.restPost(renderUrl,null,headers,payload);
} catch(e) {
    log.info(e);
    return;
}
log.info("toHtml: " + row.getParent('jira_field_def').name  + " - Back from Jira for further processing");

if ( htmlText ) {
    // <del> for strikethrough is not supported by Agile Central
    htmlText = htmlText.replace(/<del>/,"<strike>");
    htmlText = htmlText.replace(/<\/del>/,"</strike>");
    htmlText = htmlText.replace(/<ins>/,"<u>");
    htmlText = htmlText.replace(/<\/ins>/,"</u>");

    // deal with emoticons
    var emoticon_map = {
        "thumbs_up.png": "(y)",
        "thumbs_down.png": "(n)",
        "information.png": "(i)",
        "check.png": "(/)",
        "error.png": "(x)",
        "warning.png": "(!)",
        "add.png": "(+)",
        "forbidden.png": "(-)",
        "help_16.png": "(?)",
        "lightbulb_on.png": "(on)",
        "lightbulb.png": "(off)",
        "star_yellow.png": "(*)",
        "star_red.png": "(*r)",
        "star_green.png": "(*g)",
        "star_blue.png": "(*b)",
        "flag.png": "(flag)",
        "flag_grey.png": "(flagoff)"
    };
    htmlText = htmlText.replace(/<img class="emoticon" src="\/images\/icons\/emoticons\/(.*?)"(.*?)\/>/ig,function(match,capture) {
        // capture is from inside parens, match is whole thing
        return emoticon_map[capture] || "(unknown_emoticon)";
    });

    // deal with {code}
    htmlText = htmlText.replace(/<div class="codeContent panelContent">(.*?)<\/div>/ig,function(match,capture) {
        // capture is from inside parens, match is whole thing
        var contents = capture.replace(/<\/span>/ig,"</span><br/>");
        return '<div class="codeContent panelContent"><font face="courier new, monospace">' + contents + '</font></div>';
    });

    // deal with rally images
    htmlText = htmlText.replace(/<span class="error">No usable issue stored in the context, unable to resolve filename &#39;(.*?)&#39;<\/span>/gi,'<img src="$1" />');
    htmlText = htmlText.replace(/Image available in Rally \((.*?)\)/gi,'<img src="$1" />');

    row.user_value = htmlText;

    log.info("toHtml FROM: " + wikiText);
    log.info("toHtml TO  : " + htmlText);
    return;
}

log.warning("No response from JIRA for (from) wiki translation");
return;
