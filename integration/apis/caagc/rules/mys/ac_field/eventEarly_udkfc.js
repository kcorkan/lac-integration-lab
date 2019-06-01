if (row.ac_field_def.id == "State" && req.resourceName == "_toAgileCentral" && row.ac_field_def.system_attribute == "_ref"){
    if (row.user_value === null){
        row.system_value = null;
        return; 
    }
    
    var rowVal = row.user_value;
    try {
        rowVal = JSON.parse(row.user_value);
    } catch (e){
        rowVal = row.user_value;
        log.warning("[AgileCentral API][Rule:Set STate for Portfolio Items] error with JSON.parse " + row.user_value);
    }
    log.debug('[AgileCentral API][Rule:Set STate for Portfolio Items] rowVal' + rowVal);
    
    
    var params = {
        type: "TypeDefinition",
        query: "(TypePath = \"" + row.ac_object.object_type + "\")",
        system: row.ac_field_def.system_ident
    };
    var typeDef = SysUtility.restPost(req.fullBaseURL + 'lookupByQuery', null, gCFG.authHeaders, params);
    typeDef = JSON.parse(typeDef);
    
    var params = {
        type: row.ac_field_def.attribute_type,
        query: "((Name = \"" + row.user_value + "\") AND (TypeDef = \"" + typeDef._ref + "\"))",
        system: row.ac_field_def.system_ident
    };
    log.debug('[AgileCentral API][Rule:Set State for Portfolio Items]params ' + JSON.stringify(params));
    
    var res = SysUtility.restPost(req.fullBaseURL + 'lookupByQuery', null, gCFG.authHeaders, params);
    log.debug('[AgileCentral API][Rule:Set STate for Portfolio Items] result ' + res);
    if (res === null || res === "null" || res && res.length === 0){
        throw (row.ac_field_def.attribute_type + " " + row.user_value + " not found in Agile Central.");
    }
    res = JSON.parse(res);
    
    row.system_value = res[row.ac_field_def.system_attribute || "_ref"];      
     
}
