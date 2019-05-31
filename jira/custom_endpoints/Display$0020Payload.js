var url = request.getParameter('url'),
    auth = request.getParameter('auth');

var headers = {
    "headers":{"Authorization": "CALiveAPICreator " + auth + ":1"}
};

var data = SysUtility.restGet(url,null,headers);
//data = url;
var html = "<!DOCTYPE html>\n<html><head><style>";
html += "</style></head><body>";
//var data_text = JSON.stringify(data,null,2);
var data_text = JSON.stringify(JSON.parse(data),null,2);
html += "<pre>" + data_text + "</pre>";

html += "</body></html>";

responseHeaders.put('Content-Type', 'text/html');
return html;
