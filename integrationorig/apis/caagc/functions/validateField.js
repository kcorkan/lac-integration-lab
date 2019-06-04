     var headers = SysUtility.getFunction('getAuthHeaders',{system: row.ident, securityToken: false});
     headers = JSON.parse(headers);
     
     var newField = decodeURI(parameters.field);

     var params = {
         "query":"(TypePath = \"" + parameters.objectType + "\")",
         "workspace": row.url + "/workspace/" + row.workspace,
         "fetch": "Attributes"
     };
     
     var typeDef = SysUtility.restGet(row.url + '/TypeDefinition', params,headers);
     log.debug('[Agile Central API][validateField] typeDef' + typeDef);
     typeDef = JSON.parse(typeDef);
     if (typeDef && typeDef.QueryResult && typeDef.QueryResult.Errors && typeDef.QueryResult.Errors.length > 0){
         throw ("[Agile Central API][validateField] Error validating field [" + newField + "] for object type [" + parameters.objectType + "]: " + typeDef.QueryResult.Errors.join(','));
     }
     if (typeDef.QueryResult.Warnings && typeDef.QueryResult.Warnings.length > 0){
         log.warning("[Agile Central API][validateField] Warning validating field [" + newField + "] for object type [" + parameters.objectType + "]: " + typeDef.QueryResult.Warnings.join(','));
     }
     
     if (typeDef.QueryResult.Results && typeDef.QueryResult.Results.length === 0){
         throw ("[Agile Central API][validateField] No type definition found in Agile Central system [" + row.name + "]");
     }
     
    var attrUrl = typeDef.QueryResult.Results[0].Attributes._ref;
    var attrParams = { 
        pagesize: 2000,  
        fetch: "Name,ElementName"  
    };
    
    var attr = SysUtility.restGet(attrUrl, attrParams, headers);
    attr = JSON.parse(attr);
    if (attr && attr.QueryResult && attr.QueryResult.Results){
        var fieldRe = RegExp("^" + newField + "$|^c_" + newField + "$",'i');
            
        var foundField = _.find(attr.QueryResult.Results, function(field){
            return fieldRe.test(field.Name) || fieldRe.test(field.ElementName);
        });
        log.debug('[Agile Central API][validateField] after field found' + JSON.stringify(foundField));
        
        if (foundField){
            var data = {
                "id": foundField.ElementName,
                "name": foundField.Name,
                "object_type": parameters.objectType,
                "system_ident": row.ident,
                "@metadata": {"action":"MERGE_INSERT"}
            };
            
            var resp = null; 
            try {
                resp = SysUtility.restPut(req.fullBaseURL + 'fieldDefinitions',null,gCFG.authHeaders,data);
                return data;
            } catch (e){
                throw ("[Agile Central API][validateField] Error adding field [" + JSON.stringify(data) + "] to field_def table: " + e);    
            }
        } // if foundField 
    } // if results 
    return {}; 
