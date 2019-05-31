var system = parseInt(parameters.system),
object_type = parameters.object_type;

//var fields = SysUtility.getResource('fieldDefinitions',{sysfilter: ["equal(system_ident:" + system + ")","equal(object_type:'" + object_type + "')"]});


    var spec = {
      "issue": {
            "id": "object_id",
            "key": "object_key",
            "fields": {
                "issuetype": { "name": "object_type"},
                "updated": ["last_updated"]
            }
      }
};
spec.issue["#" + system] = "system_ident";
spec.issue["#MERGE_INSERT"] = "\\@metadata.action";

var syncConfig = SysUtility.getResource('syncConfig',{sysfilter: ["equal(system_ident:" + system + ")",
        "equal(object_type:'" + object_type + "')",
        "greater(ordinal:0)"]});
        
if (!syncConfig || syncConfig.length === 0){
    log.warning('No syncConfig found for the system and object type.');
    throw('No syncConfig found for the system and object type.');
}
var syncConfig = syncConfig[0];
var fields = _.map(syncConfig.fields, function(f){
    return f.fieldDef; 
});

var fieldIndex = 0;
for (var i=0; i<fields.length; i++){
    if (fields[i].id !== 'issuelinks'){
        var fieldPrefix = "fields[" + fieldIndex + "]";
        spec.issue.fields[fields[i].id] = {}
        
        if (!fields[i].user_attribute && !fields[i].system_attribute){
            spec.issue.fields[fields[i].id]["@"] = [fieldPrefix + ".user_value",fieldPrefix + ".system_value"];
        } 
        if (fields[i].user_attribute && fields[i].user_attribute != fields[i].id ){
            //spec.issue.fields[fields[i].id][fields[i].user_attribute] = fieldPrefix + ".user_value";
            var user_attr = fields[i].user_attribute.split(".");
            var obj = spec.issue.fields[fields[i].id];
            obj[user_attr[0]] = fieldPrefix + ".user_value";
            if (user_attr.length > 1){ //This should never be nested more than 2 deep.
                obj[user_attr[0]] = {};
                obj[user_attr[0]][user_attr[1]] = fieldPrefix + ".user_value";
            } 
            
            //This is to capture the Invalid Status if we aren't mapping by name
            if (fields[i].id === "status"){
                if (fields[i].user_attribute === "name"){
                    obj[fields[i].user_attribute] = [fieldPrefix + ".user_value",fieldPrefix + "._invalid"];
                } else {
                    obj.name = fieldPrefix + "._invalid";
                }    
            }
        } 
        
        if (fields[i].system_attribute && fields[i].system_attribute != fields[i].id ){
            spec.issue.fields[fields[i].id][fields[i].system_attribute] = fieldPrefix + ".system_value";    
        } 
        if (fields[i].user_attribute === null && fields[i].system_attribute === null){
            spec.issue.fields[fields[i].id]["@"] = [fieldPrefix + ".user_value",fieldPrefix + ".system_value"];
        } 
        if (fields[i].system_attribute !== null && fields[i].system_attribute === fields[i].user_attribute){
            spec.issue.fields[fields[i].id][fields[i].system_attribute] = [fieldPrefix + ".user_value",fieldPrefix + ".system_value"];
        }

        if (fields[i].name === "Sprint"){
            spec.issue.fields[fields[i].id] = {};
            spec.issue.fields[fields[i].id]["*"] = [fieldPrefix + ".user_value",fieldPrefix + ".system_value"];
            
        }
       // We need to do this last for the field so that we can clean up if there are multiple matches   
        spec.issue.fields[fields[i].id]["#" + fields[i].ident] = fieldPrefix + ".field_ident";
        spec.issue.fields[fields[i].id]["@(1,updated)"] = fieldPrefix + ".last_updated";
        spec.issue.fields[fields[i].id]["#MERGE_INSERT"] = fieldPrefix + ".\\@metadata.action";

        fieldIndex++;
       
    } 
}

return spec;
