
var data = JSON.parse(parameters.data);
var field = parameters.field; 
log.debug(data[field]);
if (!data[field]){
    return null;
}

var cfg = SysUtility.getResource('reactionConfig',{sysfilter: "equal(ident:" + parseInt(parameters.configIdent) + ")"});
if (!cfg || cfg.length === 0){
    log.error("No configuration object found for config_obj_ident " + parameters.configIdent);
    throw new Error ("No configuration object found for config_obj_ident " + parameters.configIdent);
}
cfg = cfg[0];
//parameters: field, configIdent, data 
log.debug('cfg ' + JSON.stringify(cfg));
var val = data[parameters.field];
log.debug('TRANSFORMXREF: ' + parameters.data + val);

var xref = SysUtility.getResource('xref',{sysfilter: [
        "equal(object_id:'" + val + "')", 
        "equal(api_def_ident:" + cfg.source_api_def_ident + ")", 
        "equal(system_ident:" + cfg.source_system_ident + ")"]
    });
log.debug('TRANSFORMXREF: xref ' + JSON.stringify(xref));
if (xref && xref.length > 0){
    //This should be not greater than 1
    xref = xref[0];
} else {
    log.warning("transformXref: No [source] xref found for " + val + " in system_ident " + cfg.source_system_ident + " in api " + cfg.source_api_def_ident);
}

var xref2 = SysUtility.getResource('xref',{sysfilter: [
        "equal(xref_id:'" + xref.xref_id + "')", 
        "equal(api_def_ident:" + cfg.target_api_def_ident + ")", 
        "equal(system_ident:" + cfg.target_system_ident + ")"]
    });
log.debug('xref2 ' + JSON.stringify(xref2));

if (xref2 && xref2.length > 0){
    //This should be not greater than 1
    return xref2[0].object_id; 
} else {
    log.warning("transformXref: No [target] xref found for " + xref.xref_id + " in system_ident " + cfg.target_system_ident + " in api " + cfg.target_api_def_ident);
}
return null;




