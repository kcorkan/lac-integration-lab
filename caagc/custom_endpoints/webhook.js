//TODO: validation and post to the webhook table 
var reader = new java.io.BufferedReader(new java.io.InputStreamReader(request.inputStream)),
    stream = "",
    line = "";
    
while ((line = reader.readLine()) !== null) {
    stream += line;
}

var url = request.getRequestURI().split('/'),
    caller_id = url.slice(-1)[0];

var obj = {
     payload: stream,
     caller: caller_id,
     status_id: 0
};
log.debug('obj ' + JSON.stringify(obj));

var authSettings = {
    "headers":{"Authorization": "CALiveAPICreator J8KDHTu7hRHIC7Gl1p1P:1"}
};

var table_url = "http://localhost:8080/rest/default/caagc/v1/webhook"; 

var resp = SysUtility.restPost(table_url, {}, authSettings, obj);
log.debug('webhook post response: ' + resp);
return resp;
