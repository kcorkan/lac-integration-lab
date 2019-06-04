log.debug('Add Action Rule - ' + req.resourceName)
if (req.resourceName == "_toJira"){
    log.debug('last_updated' + row.last_updated);
    
    var last_updated = row.last_updated;
    var action = "INSERT";
    if (row.object_id){
        action = "UPDATE";
        if (row.deleted !== null){
            action = "DELETE";
        }
    } 
    
      
    
    var obj = logicContext.createPersistentBean('jira_action');
    obj.jira_object_ident = row.ident;
    obj.action = action;
    obj.last_updated = last_updated;
    logicContext.insert(obj);
}
log.debug('resource' + req.resourceName)

