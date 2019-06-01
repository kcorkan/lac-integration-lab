var full_url = request.getRequestURL().toString(),
    url = full_url.split('/'),
    scope = url.slice(-1)[0],
    base_url = url.slice(0,url.length-1).join('/');
    
var auth = request.getParameter('auth');

var display_payload = base_url.replace('reaction','payload');

var html = "<!DOCTYPE html>\n<html><head><style>";
html += "body {background-color: #fff;}";
html += "h1 {text-align: left; font-family: ProximaNova,helvetica,sans-serif; color:#666;font-size:18px;font-weight:500;}";
html += "h2 {text-align: center; font-family: ProximaNova,helvetica,sans-serif; color:#666;font-size:14px;font-weight:500;padding:25px;}";
html += "table { table-layout: fixed; border-collapse: collapse;width: 100%;}";
html += "th {text-align: center; font-family: ProximaNovaSemiBold,helvetica,sans-serif; color:#000;font-size:10px;text-transform:uppercase;border: 1px solid #ddd;padding: 8px;}";
html += "td {text-align: left; font-family: NotoSans,helvetica,Arial; color:#000;font-size:11px;border: 1px solid #ddd;padding: 8px; overflow: hidden; text-overflow: ellipsis }";
html += "td:hover {overflow: visible;}";
html += "td.message {text-align: left; font-family: NotoSans,helvetica,Arial; color:#000;border: 1px solid #ddd;padding: 4px; text-overflow: ellipsis; overflow: hidden;}"
html += "tr:nth-child(even){background-color: #f2f2f2;}";
html += "a {font-family: NotoSans,Helvetica,Arial;}";
html += ".button {background-color: #e6e6e6;border-color:#fff;color: blue;padding: 15px 32px;text-align: center;text-decoration: none;display: inline-block;font-size: 12px;font-family: ProximaNovaSemiBold,helvetica,Arial;text-transform:capitalize;}"
html += ".pressed-button {background-color: #f6f6f6;border: none;color: #444;padding: 15px 32px;text-align: center;text-decoration: none;display: inline-block;font-size: 12px;font-family: ProximaNovaSemiBold,helvetica,Arial;text-transform:capitalize;font-weight:bold;}"
html += "table {background-color: #fff;}"
html += "</style></head><body>";

html += "<h1>Reactions</h1>";

var settings = {};

var statusDescription = ["Pending","In Progress","Success","Error"];
for (var i=0; i<4; i++){
  if (i.toString() !== scope){
        html += "<a class=\"button\" href=\"" + base_url + "/" + i + "?auth=" + auth + "\">" + statusDescription[i] + "</a>&nbsp;&nbsp;";    
    } else {
        html += "<div class=\"pressed-button\">" + statusDescription[i] + "</div>&nbsp;&nbsp;";    
    }    
}

if (!isNaN(scope)){
    settings.sysfilter = "equal(status:" + scope + ")";
}
settings.sysorder = "(ident:desc)";
settings.pagesize = 200;
var reactions = SysUtility.getResource('displayReactions',settings);
if (reactions && reactions.length > 0){
html += "<table>";
html += "<tr><th>Catalyst date</th>";
html += "<th>xref</th>";
html += "<th width=5%>source system</th>";
html += "<th>source object type</th>";
html += "<th>source object id</th>";
html += "<th>source action</th>";
html += "<th width=20%>source data</th>";
html += "<th>target system</th>";
html += "<th>target object type</th>";
html += "<th>target object id</th>";
html += "<th width=20%>target data</th>";
html += "</tr>";
_.each(reactions, function(r){
    var payload_text = "";
    if (r.target_data){
        payload_text = JSON.stringify(JSON.parse(r.target_data),null,2);    
    }
    html += "<tr>";
    html += "<td>" + r.catalyst.last_updated + "</td>";
    html += "<td>" + r.catalyst.xref_id + "</td>";
    html += "<td width=5%>" + r.catalyst.source_system_ident + "</td>";
    html += "<td>" + r.catalyst.source_object_type + "</td>";
    html += "<td>" + r.catalyst.source_object_id + "</td>";
    html += "<td>" + r.catalyst.source_action + "</td>";
    var source_data = "";
        if (r.catalyst.source_data){
             source_data = JSON.stringify(JSON.parse(r.catalyst.source_data),null,2);
        }
        html += "<td width=20%><pre>" + source_data + "</pre></td>";
        html += "<td>" + r.target_system_ident + "</td>";
        html += "<td>" + r.target_object_type + "</td>";
        html += "<td>" + r.target_object_id + "</td>";
        html += "<td width=20%><pre>" + payload_text + "</pre></td>";
        html += "</tr>";

        if (r.statusMessages && r.statusMessages.length > 0){
            _.each(r.statusMessages, function(sm){
                log.debug(JSON.stringify(sm));
                html += "<tr><td>";
                html += sm.message_date
                html += "</td><td class=\"message\" colspan=10>";
                var status_payload = "";
                var payload_url = sm.message_text && sm.message_text.url || null; 
                if (payload_url){
                    var headers = {
                        "headers":{"Authorization": "CALiveAPICreator " + auth + ":1"}
                    };
                    log.debug(payload_url);
                   var payload_text = SysUtility.getResource('errorMessage',{sysfilters: "equal(ident:" + sm.ident + ")"});
                     html += payload_text[0].message_text;
                    // html += "<a href=\"" + display_payload + "?auth=" + auth + "&url=" + payload_url + "\" target=\"_blank\" filename=\"payload.json\">" + payload_text + "</a>";
                 } else {
                     //payload_text = JSON.stringify(JSON.parse(sm.message_text),null,2);    
                     
                     html += "<pre>" + sm.message_text + "</pre>";
                 }
                html += "</td></tr>";       
            });
            
        }
        
});
html += "</table>";
    
} else {
    html += "<h2>No catalysts/reactions for selected status.</h2>"
}

html += "</body></html>";

responseHeaders.put('Content-Type', 'text/html');
responseHeaders.put('Authorization', "CALiveAPICreator " + auth + ":1");
return html;
