if (req.resourceName == "_fromJira"){
     var last_updated = moment(row.last_updated).toISOString();

    var action = "UPDATE";
    if (logicContext.getInitialVerb() === "INSERT"){
        action = "INSERT";
    } else {
        if (row.deleted && oldRow && !oldRow.deleted){
            action = "DELETE";
            last_updated = moment(row.deleted).toISOString();
        }
    }
    log.debug('Insert Catalyst action ' + action);
    
    var catalyst = {
        source_object_type: row.object_type,
        source_system_ident: row.system_ident,
        source_object_id: row.object_key || row.object_id,
        source_action: action,
        xref_id: row.xref_id,
        source_api_def_ident: gCFG.jiraApiIdent,
        last_updated: last_updated,
        "@metadata":  {"action":"MERGE_INSERT", "key":['source_object_id','source_object_type','source_api_def_ident','source_system_ident','last_updated']}

    };
    
    var children = row.getChildren('jira_field_List');
    
    var changed_data = {},
        state_data = {}; 
        
    _.each(children, function(c){
        log.debug('last_updated ' + moment(c.last_updated).toISOString() + '-- ' + last_updated)
        if (moment(c.last_updated).toISOString() === last_updated){
            changed_data[c.jira_field_def.name] = c.user_value || c.system_value; 
        }
        state_data[c.jira_field_def.name] = c.user_value || c.system_value; 
    });
    
    state_data.Key = row.object_key;

    //This is specific to the "Invalid" to DELETE mapping, but will only work if on_delete is selected on the cfg_obj.
    var system = SysUtility.getResource('system', {sysfilter: "equal(ident:" + row.system_ident + ")"});
    log.debug("Status/Invalid Status: " + state_data.Status + "/" + system.invalid_status);

    if (state_data.Status === system.invalid_status && system.invalid_status){
        catalyst.source_action = "DELETE";
    } 
    
    if (_.isEmpty(changed_data)){ 
        log.warning('[Jira API][Insert Catalyst] No source data for ' + row.object_key + '[' + row.ident + ']');
        return; 
    }
    changed_data.Key = row.object_key;
    
    catalyst.source_data = JSON.stringify({
        changed: changed_data,
        state: state_data
    });   
     //TODO: Links 

    
    var exists = SysUtility.getResource('catalyst',{sysfilter: [
        "equal(source_object_id:'" + catalyst.source_object_id + "')",
        "equal(source_object_type:'" + catalyst.source_object_type + "')",
        "equal(source_api_def_ident:" + gCFG.jiraApiIdent + ")",
        "equal(source_system_ident:" + catalyst.source_system_ident + ")",
        "equal(last_updated:'" + catalyst.last_updated + "')"
        ]});
    
    //Let's use a direct connection instead of a rest put: 
    if (!exists || exists.length === 0){
        
        var resp = SysUtility.restPut(gCFG.catalystUrl,null,gCFG.authHeaders, [catalyst]);
        log.debug('Event: Insert Catalyst payload:  ' + JSON.stringify(catalyst) + '<br/>response: ' + resp);

    } else {
        log.info('[Jira API][Insert Catalyst] catalyst already exists ' + JSON.stringify(catalyst));
    }
}
