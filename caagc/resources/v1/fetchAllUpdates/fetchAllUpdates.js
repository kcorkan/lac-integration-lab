var sysCfgs = SysUtility.getResource('syncConfig');
    
log.debug("[Agile Central API][fetchAllUpdates] sysCfgs: " + JSON.stringify(sysCfgs));
var response = [];
_.each(sysCfgs, function(sc){
    var original_ordinal = sc.ordinal;
    
    var stats = {
        system: sc.ident,
        updated: 0,
        deleted: 0,
        last_run: sc.last_run,
        error: null 
    };
    
    try {
        if ( original_ordinal < 0 ) {
            log.info("[Agile Central API][fetchAllUpdates] Not fetching updates because this system[" + sc.ident + "] is inactive");
            return false; //{ "status": "skip", "message": "This system is inactive" };
        }
        this_run_date = new Date().toISOString();
        
        var res = SysUtility.restGet(req.fullBaseURL + '_fetchUpdates',{"sync_config": sc.ident},gCFG.authHeaders);
        res = JSON.parse(res);
        stats.updated = res.totalRecords; 
        log.debug('[Agile Central API][fetchAllUpdates] last run comparison: ' + this_run_date + ' latestLasRun ' + res.latestLastRun);
        
        if (sc.object_type !== "Iteration"){
            res = SysUtility.restGet(req.fullBaseURL + '_fetchDeletes',{"sync_config": sc.ident},gCFG.authHeaders);
            res = JSON.parse(res);
            stats.deleted = res.totalRecords; 
        }
        
        SysUtility.restGet(sc["@metadata"].href + '/updateLastRun',{last_run_date: this_run_date},gCFG.authHeaders);//SysUtility.restGet(system["@metadata"].href + '/setOrdinal',{ ordinal: original_ordinal },config.authHeaders);
        //SysUtility.restGet(sc["@metadata"].href + '/setOrdinal',{ ordinal: original_ordinal },config.authHeaders);
        
    } catch (e){
        log.error("[Agile Central API][fetchAllUpdates] Stats: " + JSON.stringify(stats) + " Error: " + e); 
        stats.error = e;
    }
    response.push(stats);
});
return response;
