if (req.resourceName == "_fromAgileCentral" || req.resourceName === "_fromAgileCentralDeleted"){
    var last_updated = moment(row.last_updated).toISOString();
   
    var action = "UPDATE";
    if (logicContext.getInitialVerb() === "INSERT"){
        action = "INSERT";
    } else {
        if (row.deleted && oldRow && !oldRow.deleted){
            action = "DELETE";
            last_updated = moment(row.deleted).toISOString();
        }
        if (row.revision === oldRow.revision && row.revision > 1){
            //Really, don't do anything if we are coming from agile central
            log.info('Revision didnt change.  skipping');
            return;  
        }
    }
    log.debug('Insert Catalyst action ' + action);
    
    var catalyst = {
        source_object_type: row.object_type,
        source_system_ident: row.system_ident,
        source_object_id: row.object_uuid,
        source_action: action,
        xref_id: row.xref_id,
        source_api_def_ident: gCFG.acApiDefIdent,
        last_updated: last_updated,
        "@metadata":  {"action":"MERGE_INSERT", "key":['source_object_id','source_object_type','source_api_def_ident','source_system_ident','last_updated']}
    };
    
    var children = row.getChildren('fields');
    log.debug('last_updated ' + last_updated + ' ' + children.length);
   
   var changed_data = {}, 
       state_data = {}; 
       
   _.each(children, function(c){
        log.info(c.ac_field_def.name + ' -- ' + moment(c.last_updated).toISOString() + ' ' + last_updated);
        if (c.ac_field_def){
            log.debug('child updated: ' + c.last_updated + '-- parent updated: ' + last_updated);
            if (moment(c.last_updated).toISOString() === last_updated){
                changed_data[c.ac_field_def.name] = c.user_value || c.system_value; 
            }   
            state_data[c.ac_field_def.name] = c.user_value || c.system_value; 
         }
   });

    if (state_data["Formatted ID"]){
        changed_data["Formatted ID"] = state_data["Formatted ID"];
    }

    if (_.isEmpty(changed_data)){ 
        log.warning('Insert Catalyst -- No source data for ' + row.object_uuid + '[' + row.ident + ']');
        return; 
    }
    
    catalyst.source_data = JSON.stringify({
        changed: changed_data,
        state: state_data
    });   
     //TODO: Links 

    var exists = SysUtility.getResource('catalyst',{sysfilter: [
        "equal(source_object_id:'" + catalyst.source_object_id + "')",
        "equal(source_object_type:'" + catalyst.source_object_type + "')",
        "equal(source_api_def_ident:" + gCFG.acApiDefIdent + ")",
        "equal(source_system_ident:" + catalyst.source_system_ident + ")",
        "equal(last_updated:'" + catalyst.last_updated + "')"
        ]});
    
    //Let's use a direct connection instead of a rest put: 
    if (!exists || exists.length === 0){
        var resp = SysUtility.restPut(gCFG.catalystUrl,null,gCFG.authHeaders, [catalyst]);
        log.debug('[Agile Central API][Insert Catalyst] payload:  ' + JSON.stringify(catalyst) + '<br/>response: ' + resp);
    } else {
        log.info('[Agile Central API][Insert Catalyst] catalyst already exists ' + JSON.stringify(catalyst));
    }
}

