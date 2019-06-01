if(!row.source_object_id){
    //get the object_id
    var api = SysUtility.getFunction('getApiConfig',{apiIdent: row.source_api_def_ident });
    api = JSON.parse(api);
        
    var resp = SysUtility.restGet(api.baseUrl + 'system/' + row.source_system_ident + '/fetchObjectID',{object_type: row.source_object_type, object_key: row.source_object_key},api.authHeaders);
    if (resp){
        row.source_object_id = JSON.parse(resp);
    } else {
        var msg = "ObjectID not found for " + row.source_object_key;
        log.error(msg);
        throw msg;
    }
}

if (!row.target_object_id){
    var api = SysUtility.getFunction('getApiConfig',{apiIdent: row.target_api_def_ident });
    api = JSON.parse(api);
        
    var resp = SysUtility.restGet(api.baseUrl + 'system/' + row.target_system_ident + '/fetchObjectID',{object_type: row.target_object_type, object_key: row.target_object_key},api.authHeaders);

    if (resp){
        row.target_object_id =  JSON.parse(resp);
    } else {
        var msg = "ObjectID not found for " + row.source_object_key;
        log.error(msg);
        throw msg;
    }
}
