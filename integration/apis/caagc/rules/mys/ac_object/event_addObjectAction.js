if (req.resourceName == "_toAgileCentral"){
    log.debug('request ' + req.json);

    var obj = logicContext.createPersistentBean('ac_action');
    obj.ac_object_ident = row.ident;
    
    var action = row.object_uuid ? "UPDATE" : "INSERT";
    if (logicContext.getInitialVerb() === "UPDATE"){
        if (row.deleted !== null && oldRow.deleted === null){
            action = "DELETE";
        }    
    }
    
    obj.action = action;
    obj.last_updated = row.last_updated;
    logicContext.insert(obj);
}
