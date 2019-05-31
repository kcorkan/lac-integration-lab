    var headers = SysUtility.getFunction('getAuthHeaders',{system: row.ident, securityToken: false});
     headers = JSON.parse(headers);
     
     var object_type = decodeURI(parameters.object_type);
     
     var params = {
         "query":"(FormattedID = \"" + parameters.object_key + "\")",
         "workspace": row.url + "/workspace/" + row.workspace,
         "fetch": "ObjectUUID"
     };
     
     var obj = SysUtility.restGet(row.url + '/' + object_type, params,headers);
     log.debug('fetchObjectID results ' + obj);
     obj = JSON.parse(obj);
     if (obj && obj.QueryResult && obj.QueryResult.Errors && obj.QueryResult.Errors.length > 0){
         throw ("Error fetching ObjectID [" + parameters.object_key + "] for object type [" + parameters.object_type + "]: " + obj.QueryResult.Errors.join(','));
     }

     if (obj.QueryResult.Results && obj.QueryResult.Results.length === 0){
         throw ("No object found in Agile Central system [" + row.name + "]");
     }
     
    var object_id = obj.QueryResult.Results[0].ObjectUUID;
    return object_id; 
