var full_url = request.getRequestURL().toString(),
    url = full_url.split('/'),
    scope = url.slice(-1)[0],
    base_url = url.slice(0,url.length-1).join('/');
    
var auth = request.getParameter('auth');

var display_payload = base_url.replace('webhook','payload');

var html = "<!DOCTYPE html>\n<html><head><style>";
html += "body {background-color: #fff;}";
html += "h1 {text-align: left; font-family: ProximaNova,helvetica,sans-serif; color:#666;font-size:18px;font-weight:500;}";
html += "h2 {text-align: center; font-family: ProximaNova,helvetica,sans-serif; color:#666;font-size:14px;font-weight:500;padding:25px;}";
html += "table { border-collapse: collapse;width: 100%;}";
html += "th {text-align: center; font-family: ProximaNovaSemiBold,helvetica,sans-serif; color:#000;font-size:10px;text-transform:uppercase;border: 1px solid #ddd;padding: 8px;}";
html += "td {text-align: left; font-family: NotoSans,helvetica,Arial; color:#000;font-size:11px;border: 1px solid #ddd;padding: 8px;}";
html += "tr:nth-child(even){background-color: #f2f2f2;}";
html += "a {font-family: NotoSans,Helvetica,Arial;}";
html += ".button {background-color: #e6e6e6;border-color:#fff;color: blue;padding: 15px 32px;text-align: center;text-decoration: none;display: inline-block;font-size: 12px;font-family: ProximaNovaSemiBold,helvetica,Arial;text-transform:capitalize;}"
html += ".pressed-button {background-color: #f6f6f6;border: none;color: #444;padding: 15px 32px;text-align: center;text-decoration: none;display: inline-block;font-size: 12px;font-family: ProximaNovaSemiBold,helvetica,Arial;text-transform:capitalize;font-weight:bold;}"
html += "table {background-color: #fff;}"
html += "</style></head><body>";

html += "<h1>Jira Webhooks</h1>";

var statuses = SysUtility.getResource('webhook_status');
var settings = {};

_.each(statuses, function(s){
    if (s.status_id.toString() !== scope){
        html += "<a class=\"button\" href=\"" + base_url + "/" + s.status_id + "?auth=" + auth + "\">" + s.status_description.toLowerCase() + "</a>&nbsp;&nbsp;";    
    } else {
        html += "<div class=\"pressed-button\">" + s.status_description.toLowerCase() + "</div>&nbsp;&nbsp;";    
    }
});

if (!isNaN(scope)){
    settings.sysfilter = "equal(status_id:" + scope + ")";
}
settings.sysorder = "(received:desc)";
settings.pagesize = 200;
var hooks = SysUtility.getResource('webhook',settings);
if (hooks && hooks.length > 0){
html += "<table>";
html += "<tr><th></th><th>Received date</th><th>system</th><th>payload</th><th>status message</th></tr>"
_.each(hooks, function(h){
    if (h.payload){
        var payload_url = h.payload && h.payload.url || null; 
        var webhook_url = h["@metadata"].href;
    
        var payload_text = payload_url;
        if (payload_url){
            payload_url = payload_url.replace('/http/','/data/');
        } else {
            payload_text = JSON.stringify(JSON.parse(h.payload),null,2);    
        }
        webhook_url = webhook_url.replace('/http/','/rest/');
    
        html += "<tr>";
        if (scope !== "0"){
            html += "<td><a href=\"" + webhook_url + "/rerun?auth=" + auth + "\" target=\"_blank\">rerun</a></td>";
        } else {
            html += "<td></td>";
        }
        html += "<td>" + h.received + "</td>";
        html += "<td>" + h.caller + "</td>";
        if (payload_url){
            html += "<td><a href=\"" + display_payload + "?auth=" + auth + "&url=" + payload_url + "\" target=\"_blank\" filename=\"payload.json\">" + payload_text + "</a></td>";
        } else {
            html += "<td><pre>" + payload_text + "</pre></td>";
        }
        html += "<td>" + h.status_message + "</td>";
        html += "</tr>";   
    }
});
html += "</table>";
    
} else {
    html += "<h2>No webhooks for selected status.</h2>"
}

html += "</body></html>";

responseHeaders.put('Content-Type', 'text/html');
responseHeaders.put('Authorization', "CALiveAPICreator " + auth + ":1");
return html;
