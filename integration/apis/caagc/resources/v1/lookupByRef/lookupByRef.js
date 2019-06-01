var urlParams = JSON.parse(req.json);
log.debug('[Agile Central API][lookupByRef] params ' + req.json);
var ref = urlParams.ref,
    system_ident = urlParams.system,
    object_type = urlParams.object_type;

if (!ref || !system_ident || !object_type ){
    var msg = "[Agile Central API][lookupByRef] _ref and system parameters must be provided.";
    log.error(msg);
    throw (msg);
}

    var system = SysUtility.getResource('system',{sysfilter: "equal(ident:" + system_ident + ")"});
    var url = system.url,
    apiKey = system.apiKey;
    var headers =  SysUtility.getFunction('getAuthHeaders',{system: system_ident, securityToken: false});
    headers = JSON.parse(headers);
    
    var data = SysUtility.restGet(ref ,null,headers);
    log.debug('[Agile Central API][lookupByRef] data ' + data);
    data = JSON.parse(data);
    
    if (data[object_type]){
        return data[object_type];   
    } else {
        var msg = "[Agile Central API][lookupByRef] Data not found for ref [" + ref + "] in system[" + system_ident + "]: " + JSON.stringify(data);
        log.error(msg);
        throw (msg);
    }
        
    return null;
