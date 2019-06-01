var urlParams = JSON.parse(req.json);
log.debug('[Agile Central API][lookupByQuery] urlparams' + req.json);

var object_type = urlParams.type,
    query = urlParams.query,
    system_ident = urlParams.system;

    
if (!object_type || !query || !system_ident ){
    var msg = "[Agile Central API][lookupByQuery] Type, query and system parameters must be provided.";
    log.error(msg);
    throw (msg);
}

    var system = SysUtility.getResource('system',{sysfilter: "equal(ident:" + system_ident + ")"})
    var url = system.url,
    apiKey = system.apiKey;
    var headers =  SysUtility.getFunction('getAuthHeaders',{system: system_ident, securityToken: false});
    headers = JSON.parse(headers);
    
        var params = {
            query: urlParams.query,
            workspace: url + "/workspace/" + system.workspace
        };
        
        log.debug('[Agile Central API][lookupByQuery] params' + JSON.stringify(params));
        var data = SysUtility.restGet(url + '/' + object_type ,params,headers);
        log.debug('[Agile Central API][lookupByQuery] data ' + data)
        data = JSON.parse(data);
    
        if (data.QueryResult){
            log.debug(JSON.stringify(data.QueryResult));
            if (data.QueryResult.Errors.length > 0){
                var msg = "[Agile Central API][lookupByQuery] Error: " + data.QueryResult.Errors.join(',');
                log.error(msg);
                throw(msg);
            }
            
            if (data.QueryResult.TotalResultCount > 0){
                return data.QueryResult.Results[0];
            }
            log.info("[Agile Central API][lookupByQuery] No results found for " + JSON.stringify(params));
        } else {
            var msg = "[Agile Central API][lookupByQuery] Error in lookup:  Unexpected data format returned.";
            log.error(msg);
            throw (msg);
        }
        
    return null;
