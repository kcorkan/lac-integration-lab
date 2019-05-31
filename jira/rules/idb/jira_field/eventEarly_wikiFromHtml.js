if ( req.resourceName != "_toJira") {
    log.debug("toWiki: Not going to Jira");
    return;
}

var schema_type = row.getParent('jira_field_def') && row.getParent('jira_field_def').schema_type || "";
if (schema_type.toLowerCase() != "wiki"){
    log.debug("toWiki: field_def is not wiki " + row.getParent('jira_field_def').name + " (" + schema_type + ")");
    return;
}
if (logicContext.getVerb().toUpperCase() != "UPDATE") {
    log.debug("toWiki: Not an update. " + row.getParent('jira_field_def').name + " ( " + logicContext.getVerb() + ")");
} else {
    log.debug(oldRow && oldRow.user_value + ' ' + row.user_value);
    
    if (oldRow && oldRow.user_value == row.user_value) {
        log.debug("toWiki: Not a change to user value. " + row.getParent('jira_field_def').name );
        return;
    }
}

var htmlText = row.user_value;

if ( !htmlText || _.isEmpty(htmlText) ) {
    log.info("HTML to wiki - htmlText is empty")
    row.system_value = "";
    return;
}

var wikiText = htmlText;
// simple replacement
// the new quick details page adds unnecessary hard returns
wikiText = wikiText.replace(/[\n\r]/g,"");

wikiText = wikiText.replace(/&nbsp;/gi," ");
wikiText = wikiText.replace(/<font.+?>/gi,"<font>");
wikiText = wikiText.replace(/<font>/gi,"");
wikiText = wikiText.replace(/<\/font>/gi,"");

// careful of spaces
wikiText = wikiText.replace(/(\s+)<\/b>/gi,"</b> ");
wikiText = wikiText.replace(/(\s+)<\/strong>/gi,"</strong> ");
wikiText = wikiText.replace(/(\s+)<\/strike>/gi,"</strike> ");
wikiText = wikiText.replace(/(\s+)<\/i>/gi,"</i> ");
wikiText = wikiText.replace(/<b>(\s+)/gi," <b>");
wikiText = wikiText.replace(/<strong>(\s+)/gi," <strong>");
wikiText = wikiText.replace(/<strike>(\s+)/gi," <strike>");

wikiText = wikiText.replace(/<i>(\s+)/gi," <i>");
wikiText = wikiText.replace(/<u>(\s+)/gi," <u>");
wikiText = wikiText.replace(/<b><br \/><\/b>/gi,"\n");
wikiText = wikiText.replace(/<strong><br \/><\/strong>/gi,"\n");
wikiText = wikiText.replace(/<strike><br \/><\/strike>/gi,"\n");

wikiText = wikiText.replace(/<i><br \/><\/i>/gi,"\n");
wikiText = wikiText.replace(/<u><br \/><\/u>/gi,"\n");

wikiText = wikiText.replace(/<b>(.*?)<\/b>/gi,"*$1*");
wikiText = wikiText.replace(/<strong>(.*?)<\/strong>/gi,"*$1*");
wikiText = wikiText.replace(/<strike>(.*?)<\/strike>/gi,"-$1-");

wikiText = wikiText.replace(/<i>(.*?)<\/i>/gi,"_$1_");
wikiText = wikiText.replace(/<u>(.*?)<\/u>/gi,"+$1+");
wikiText = wikiText.replace(/<i style="font-weight: bold;">(.*?)<\/i>/gi,"_*$1*_");
wikiText = wikiText.replace(/<em>(.*?)<\/em>/gi,"_$1_");


// divs
// deal with code block as best we can
//
wikiText = wikiText.replace(/<div class="codeContent panelContent">(.*?)<\/div>/ig,function(match,capture) {
    // capture is from inside parens, match is whole thing
    return "{code:java}\n" + capture + "{code}\n";
});


// get rid of style
wikiText = wikiText.replace(/<div.*?>/ig,"<div>");
wikiText = wikiText.replace(/<div>(\n+)<\/div>/igm,"$1");
wikiText = wikiText.replace(/<div>(.*?)<\/div>/igm,"\n$1");

var counter = 0;
while ( /<p>(.*?)<\/p>/.test(wikiText) && counter < 100 ) {
    wikiText = wikiText.replace(/<p>(.*?)<\/p>/i,"$1\n\n");
    counter = counter + 1;
}

// other line breaks
wikiText = wikiText.replace(/<br \/>\n/mgi,"\n");
wikiText = wikiText.replace(/<br \/>/mgi,"\n");
wikiText = wikiText.replace(/<br\/>\n/mgi,"\n");
wikiText = wikiText.replace(/<br\/>/mgi,"\n");

// images to be stubbed in Jira because we don't have a full url
wikiText = wikiText.replace(/<img src="(.*?)".*?>/gi, function(match,capture){
    // capture is from inside parens, match is whole thing
    if ( /^http/.test(capture) ) {
        return "!" + capture + "!";
    }

    return "Image available in Rally (" + capture + ")";
});
// images that were stubbed in Rally because we don't have a full url (text orig copied from Jira)
// need to replace
wikiText = wikiText.replace(/Image available in Jira \((.*?)\)/gi,"!$1!");

// user lists  (?? = zero or one time)
wikiText = wikiText.replace(/<ol>([^]+?)<\/ol>/mig,function(match,capture) {
    // capture is from inside parens, match is whole thing
    var items = capture.replace(/<li>(.*?)<\/li>\n??/gi,"# $1\n");
    return "<ol>\n" + items + "</ol>\n";
});

wikiText = wikiText.replace(/<ul>([^]+?)<\/ul>/mig,function(match,capture) {
    // capture is from inside parens, match is whole thing
    var items = capture.replace(/<li>(.*?)<\/li>\n??/gi,"* $1\n");
    return "<ul>\n" + items + "</ul>\n";
});

wikiText = wikiText.replace(/\n??<ul>\n??/gi,"");
wikiText = wikiText.replace(/\n??<ol>\n??/gi,"");
wikiText = wikiText.replace(/\n??<\/ul>/gi,"\n");
wikiText = wikiText.replace(/\n??<\/ol>/gi,"\n");

// TABLE
// get rid of style
wikiText = wikiText.replace(/<thead(.*?)>/ig,"<thead>");
wikiText = wikiText.replace(/<table(.*?)>/ig,"<table>");
wikiText = wikiText.replace(/<tbody(.*?)>/ig,"<tbody>");

wikiText = wikiText.replace(/<table>(.*?)<\/table>/ig,function(match,capture) {
    // capture is from inside parens, match is whole thing
    var inside = capture;

    inside = "\n" + inside;

    inside = inside.replace(/<thead>(.*?)<\/thead>/ig,function(head_match,head_capture) {
        // Rally wraps header with thead
        head_capture = head_capture.replace(/<th(.*?)>/ig,"<th>");
        head_capture = head_capture.replace(/<th>(\s*)<\/th>/ig,"<th> <\/th>");

        head_capture = head_capture.replace(/<\/th>(\s*?)<th>/ig,"||");
        head_capture = head_capture.replace(/<\/th>/ig,"||\n");
        head_capture = head_capture.replace(/<th>/gi,"||");

        return head_capture;
    });

    inside = inside.replace(/<tbody>(.*?)<\/tbody>/ig,function(body_match,body_capture) {
        body_capture = body_capture.replace(/<td(.*?)>/ig,"<td>");
        body_capture = body_capture.replace(/<td>(\s*)<\/td>/ig,"<td> <\/td>");

        body_capture = body_capture.replace(/<\/td>(\s*?)<td>/gi,"|");
        body_capture = body_capture.replace(/<td>/gi,"|");
        body_capture = body_capture.replace(/<\/td>/gi,"|\n");

        // jira wraps tbody around the whole thing, including the head
        body_capture = body_capture.replace(/<th(.*?)>/ig,"<th>");
        body_capture = body_capture.replace(/<th>(\s*)<\/th>/ig,"<th> <\/th>");

        body_capture = body_capture.replace(/<\/th>(\s*?)<th>/ig,"||");
        body_capture = body_capture.replace(/<\/th>/ig,"||\n");
        body_capture = body_capture.replace(/<th>/gi,"||");

        return body_capture;
    });

    return inside;

});
wikiText = wikiText.replace(/<table>/ig,"\n");

// anchor
//    <a href="http://example.com" class="external-link">google</a>
wikiText = wikiText.replace(/<a href="(.*?)".*>(.*?)<\/a>/i, "[$2|$1]");

// headings
wikiText = wikiText.replace(/<a name(.*?)a>/gi,"");
wikiText = wikiText.replace(/<a><\/a>/gi,"");

wikiText = wikiText.replace(/<h(.*?)>(.*?)<\/h(.*?)>/ig,function(match,capture) {
    // capture is from inside parens, match is whole thing
    var innards = match.replace(/<h(.*?)>(.*?)<\/h(.*?)>/i,"$2");
    return "h" + capture + ". " + innards + "\n";
});
// clear trailing tags
wikiText = wikiText.replace(/<h(.*?)>[\s\r\n]+<\/h(.*?)>/gi,"\n");


// blockquotes
// clear style
wikiText = wikiText.replace(/<blockquote(.*?)>/ig,"<blockquote>");

// [^] means match anything that is not "no character" (.* doesn't always get \r\n looks like)
wikiText = wikiText.replace(/<blockquote><p>([^]+?)<\/p><\/blockquote>/ig, function(match,capture){
    return "{quote}" + capture + "{quote}\n";
});
wikiText = wikiText.replace(/<blockquote>([^]+?)<\/blockquote>/ig, function(match,capture){
    return "{quote}" + capture + "{quote}\n";
});


// clear any other tags we cannot work with
wikiText = wikiText.replace(/<(.*?)>/ig,"");

log.info("to wiki FROM: " + htmlText);
log.info("to wiki   TO: " + wikiText);
row.system_value = wikiText;


return;
