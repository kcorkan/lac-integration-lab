if (req.resourceName === "_toJira" && 
    row.jira_field_def.id === "project" && 
    row.jira_field_def.user_attribute === "name"){
    log.debug('Set Project System Value if needed')
    //We need to get the id or key for this project, unfortunately jira doesn't allow querying by name fro a specific project so we need to get all of them
    //TODO: put this in a table associated with the system maybe?  
    var system = SysUtility.getResource('system',{sysfilter: "equal(ident:"+ row.jira_field_def.system_ident + ")"});
    if (!system){
        log.warning("Jira System not found: " + row.jira_field_def.system_ident);
        //This will cause an error downstream
        return;
    }

    var url = [system.url,'rest/api/2/project'].join('/');
    var params = {};
    var authHeaders = SysUtility.getFunction('getAuthHeaders',{system: system.ident});
    authHeaders = JSON.parse(authHeaders);
    var projects = SysUtility.restGet(url,params,authHeaders);
    log.debug('projects ' + projects);
    projects = JSON.parse(projects);
    var prj = _.find(projects, function(p){
        return p.name.toLowerCase() === row.user_value.toLowerCase();
    });
    log.debug('found project' + JSON.stringify(prj));
    if (prj){
        row.system_value = prj[row.jira_field_def.system_attribute];
    } else {
        log.warning('No project found in jira system for ' + row.user_value);
    }
}
