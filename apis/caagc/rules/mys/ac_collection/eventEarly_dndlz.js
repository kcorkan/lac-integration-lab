log.debug(row.user_value + '-- collection set system value -- ' + row.ac_field_def.system_attribute + req.resourceName)
if (row.ac_field_def.system_attribute == "_ref" && req.resourceName == "reaction"){
    if (row.user_value === null){
        row.system_value = null;
        return; 
    }
    
    var rowVal = row.user_value;
    
    var params = {
        type: row.ac_field_def.attribute_type_def,
        key: row.ac_field_def.user_attribute || "Name",
        value: rowVal,
        system: row.ac_field_def.system_ident
    };
    log.debug('params ' + JSON.stringify(params));
    
    var res = SysUtility.restPost(req.fullBaseURL + 'lookup', null, gCFG.authHeaders, params);
    log.debug('result ' + res);
    if (res === null || res === "null" || res && res.length === 0){
        log.error(row.ac_field_def.attribute_type + " " + row.user_value + " not found in Agile Central.");
        throw (row.ac_field_def.attribute_type + " " + row.user_value + " not found in Agile Central.");
    }
    res = JSON.parse(res);
    
    row.system_value = res[row.ac_field_def.system_attribute || "_ref"];      
     
}
