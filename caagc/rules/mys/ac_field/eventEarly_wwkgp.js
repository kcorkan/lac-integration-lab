var specialFields = ['State','Iteration','Release']
if (row.ac_field_def.system_attribute == "_ref" && req.resourceName == "_toAgileCentral"){
    if (_.contains(specialFields, row.ac_field_def.id)){ return; }
    if (row.user_value === null){
        row.system_value = null;
        return; 
    }
    
    var rowVal = row.user_value;
    try {
        rowVal = JSON.parse(row.user_value);
    } catch (e){
        log.warning('[AgileCentral API][Rule:Set Reference from Reaction] unable to parse JSON ' + row.user_value);
        rowVal = row.user_value;
    }
    log.debug('[AgileCentral API][Rule:Set Reference from Reaction] rowVal' + rowVal);
   
    var params = {
        type: row.ac_field_def.attribute_type,
        key: row.ac_field_def.user_attribute || "Name",
        value: rowVal,
        system: row.ac_field_def.system_ident
    };
    log.debug('[AgileCentral API][Rule:Set Reference from Reaction] params ' + JSON.stringify(params));
    
    var res = SysUtility.restPost(req.fullBaseURL + 'lookup', null, gCFG.authHeaders, params);
    log.debug('[AgileCentral API][Rule:Set Reference from Reaction] result ' + res);
    if (res === null || res === "null" || res && res.length === 0){
        log.debug (row.ac_field_def.attribute_type + " " + row.user_value + " not found in Agile Central.");
        throw ("[AgileCentral API][Rule:Set Reference from Reaction] " + row.ac_field_def.attribute_type + " " + row.user_value + " not found in Agile Central.");
    }
    res = JSON.parse(res);
    
    row.system_value = res[row.ac_field_def.system_attribute || "_ref"];      
    if (row.ac_field_def.id === "Project"){
        row.ac_object.Project === row.system_value;
    }
}
