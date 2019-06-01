var cfg = SysUtility.getResource('apiDef',{sysfilter: "equal(ident:" + parseInt(parameters.apiIdent) + ")"});
log.debug('cfg' + JSON.stringify(cfg));
if (cfg && cfg.url_name && cfg.api_auth_key){
    var baseUrl = req.fullBaseURL.replace(SysUtility.getApiInfo().urlFragment, cfg.url_name); //TODO incorporate version here,
    //TODO: if we are using https at the loadbalancer but not behind, we need to do this for cross-api communications
    //baseUrl = baseUrl.replace('https','http');
    var authHeaders = {
        "headers":{
                "Authorization": "CALiveAPICreator " + cfg.api_auth_key + ":1"
            }
        };
    
    return {
        baseUrl: baseUrl,
        authHeaders: authHeaders
    };
}
return null;
