var urlParams = JSON.parse(req.json);
var object_type = urlParams.type,
    attribute_name = urlParams.key,
    attribute_value = urlParams.value,
    system_ident = urlParams.system;

    
log.debug('url params ' + object_type + attribute_name + system_ident);    
if (!object_type || !attribute_name || !system_ident ){
    log.error("[Agile Central API][lookup] Type, key and system parameters must be provided.");
    throw ("type, key and system parameters must be provided.");
}

    var system = SysUtility.getResource('system',{sysfilter: "equal(ident:" + system_ident + ")"})
    var url = system.url,
    apiKey = system.apiKey;
    var headers =  SysUtility.getFunction('getAuthHeaders',{system: system_ident, securityToken: false});
    headers = JSON.parse(headers);
    
    var isArray = _.isArray(attribute_value);  
    if (!_.isArray(attribute_value)){
        attribute_value = [attribute_value];
    } 

        var query =  '(' + attribute_name + ' = "' + attribute_value + '")';
    
        var params = {
            query: query,
            workspace: url + "/workspace/" + system.workspace
        };
        
        log.debug('[Agile Central API][lookup] params' + JSON.stringify(params));
        var data = SysUtility.restGet(url + '/' + object_type ,params,headers);
        log.debug('[Agile Central API][lookup] data ' + data)
        data = JSON.parse(data);
    
        if (data.QueryResult){
            log.debug(JSON.stringify(data.QueryResult));
            if (data.QueryResult.Errors.length > 0){
                log.error("Error in lookup: " + data.QueryResult.Errors.join(','));
                throw("[Agile Central API][lookup] Error in lookup: " + data.QueryResult.Errors.join(','));
            }
            
            if (data.QueryResult.TotalResultCount > 0){
                return data.QueryResult.Results[0];
            }
            log.info("[Agile Central API][lookup] No results found for " + JSON.stringify(params));
        } else {
            var msg = "[Agile Central API][lookup] Error in lookup:  Unexpected data format returned.";
            log.error(msg);
            throw (msg);
        }
        
    return null;
