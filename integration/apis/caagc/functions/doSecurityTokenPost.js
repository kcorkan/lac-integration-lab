    var start_t = moment().valueOf();
    
    var parseEntity = function(response){
        var InputStreamReader = Java.type("java.io.InputStreamReader");
        if ( !response.getEntity() ) {
            return {};
        }
        var inStr = new InputStreamReader(response.getEntity().getContent());
        var BufferedReader = Java.type("java.io.BufferedReader");
        var rd = new BufferedReader(inStr);
        var json = "";
        var line = rd.readLine();
        while (line !== null) {
            json += line;
            line = rd.readLine();
        }
        return json;
    };        
 
    var system = SysUtility.getResource('system',{sysfilter: "equal(ident:" + parseInt(parameters.system_ident) + ")" }),
        url = system.url + "/security/authorize",
        settings = SysUtility.getFunction('getAuthHeaders',{system: system.ident });
        settings = JSON.parse(settings);
 
    /** Get the security token **/
    var clientBuilder = Java.type("org.apache.http.impl.client.HttpClientBuilder").create();
    var client = clientBuilder.build();

    var HttpGet = Java.type("org.apache.http.client.methods.HttpGet");
    var getReq = new HttpGet(url);
    if ( settings.headers ) {
        var headers = settings.headers;
        for ( var i in headers ) {
            getReq.setHeader(i,headers[i]);
        }
    }

    var response = client.execute(getReq);
    var token = JSON.parse(parseEntity(response)).OperationResult.SecurityToken;
    log.debug('[Agile Central API][Function:doSecurityTokenPost] token' + token);

    var HttpPost = Java.type("org.apache.http.client.methods.HttpPost");
    url = parameters.url + "?key=" + token;
    var postReq = new HttpPost(url);
    if ( settings.headers ) {
        var headers = settings.headers;
        for ( var i in headers ) {
            postReq.setHeader(i,headers[i]);
        }
    }

    var payload = parameters.payload;
    var StringEntity = Java.type("org.apache.http.entity.StringEntity");
    var entity = new StringEntity(payload);
    postReq.setEntity(entity);
    var response = client.execute(postReq);        

    if (response.getStatusLine().getStatusCode() > 299) {
        var end_t = moment().valueOf(),
            elapsed_t = (end_t-start_t)/1000;
        log.error("[Agile Central API][doSecurityTokenPost] elapsed seconds: " + elapsed_t);
        return {
            status: "[Agile Central API][Function:doSecurityTokenPost] Error - call failed",
            statusCode: response.getStatusLine().getStatusCode(),
            error: JSON.stringify(parseEntity(response)),
            errorMessage: JSON.stringify(parseEntity(response))
        };
    }
    
    var end_t = moment().valueOf(),
        elapsed_t = (end_t-start_t)/1000;
    var returnJson = JSON.parse(parseEntity(response));   
    log.debug("[Agile Central API][doSecurityTokenPost] elapsed seconds: " + elapsed_t);
    return returnJson;
