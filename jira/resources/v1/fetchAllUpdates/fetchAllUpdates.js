var sysCfgs = SysUtility.getResource('syncConfig');
    
log.debug("fetchAllUpdates sysCfgs: " + JSON.stringify(sysCfgs));
var errors = [];
_.each(sysCfgs, function(sc){
    try {
        var url = "http://localhost:8080/rest/default/jira/v1/";

        SysUtility.restGet(url + '_fetchUpdates',{"sync_config": sc.ident},gCFG.authHeaders);
    } catch (e){
        log.error("Error in fetchAllUpdates for system[" + sc.ident + "]: " + e);   
       
    }
});
return errors;
