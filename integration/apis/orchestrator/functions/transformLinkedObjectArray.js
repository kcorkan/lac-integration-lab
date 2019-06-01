var data = JSON.parse(parameters.data);

if (!data[parameters.field]){
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
log.debug('transformLinkedObjectArray: ' + parameters.data + val);

if (!_.isArray(val)){
    val = [val];
}

// var sql_filter = "system_ident=" + cfg.source_system_ident + " AND api_def_ident=" + cfg.source_api_def_ident + " AND object_id IN ('" + val.join("','") + "')";
// //var sql_filter = "object_id IN ('" + val.join("','") + "') AND api_def_ident=" + cfg.source_api_def_ident + " AND system_ident=" + cfg.source_system_ident;
// log.debug(sql_filter);
// var xref = SysUtility.getResource('linkedObjects',{filter: sql_filter});
//log.debug('transformLinkedObjectArray: xref ' + JSON.stringify(xref));

var transformedVals = [];
_.each(val, function(v){
    var sys_filter = ["equal(system_ident:" + cfg.source_system_ident + ")",
                "equal(api_def_ident:" + cfg.source_api_def_ident + ")",
                "equal(object_id:'" + v + "')"
    ];
    var xref = SysUtility.getResource('xref',{sysfilter: sys_filter});
    if (xref && xref.length > 0){
        var x_obj_filter = ["equal(system_ident:" + cfg.target_system_ident + ")",
                "equal(api_def_ident:" + cfg.target_api_def_ident + ")",
                "equal(xref_id:'" + xref[0].xref_id + "')"]
        var x_obj = SysUtility.getResource('xref',{sysfilter: x_obj_filter});
        if (x_obj && x_obj.length > 0){
            transformedVals.push(x_obj[0].object_id);
        }
        
    }

    // var xrefObj = _.find(xref, function(x){ return v === x.object_id && x.system_ident === cfg.source_system_ident && x.api_def_ident === cfg.source_api_def_ident; });
    // log.debug('xrefObj' + JSON.stringify(xrefObj));
    // if (xrefObj && xrefObj.xref_id){
    //     var tVal = _.find(xref, function(x){ return x.xref_id === xrefObj.xref_id && x.system_ident === cfg.target_system_ident && x.api_def_ident === cfg.target_api_def_ident; });
    //     if (tVal && tVal.object_id){
    //         transformedVals.push(tVal.object_id);
    //     }
    // }
    
});

if (transformedVals && transformedVals.length > 0){
    //This should be not greater than 1
    return transformedVals; 
}
log.warning("transformLinkedObjectArray:  No linked object data found for object_ids [" + val.join(',') + "]");
return null;




