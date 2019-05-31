var system = parameters.system,
object_type = parameters.object_type;

var fields = SysUtility.getResource('fieldDefinitions',{sysfilter: ["equal(system_ident:" + system + ")","equal(object_type:'" + object_type + "')"]});
log.debug("buildTransformPayloadToObjectSpec for system=" + system + " and object_type=" + object_type);
    var spec = {
      "*": {
            "id": "[&1].object_id",
            "key": "[&1].object_key",
            "fields": {
                "updated": "[&2].last_updated"
            }
      }
};
spec["*"]["#" + object_type] = "[&1].object_type";
spec["*"]["#" + system] = "[&1].system_ident";
spec["*"].fields.issuelinks = { "*": {
     "inwardIssue": {
        "key": "[&5].outwardLinks[&2].inward_key",
        "@(1,type.id)": "[&5].outwardLinks[&2].fieldDef.link_type_id",
        "fields": {
            "issuetype": {
                "name": "[&7].outwardLinks[&4].inward_object_type"
            }
        },
        "@(4,key)": "[&5].outwardLinks[&2].outward_key",
        "@(4,updated)": "[&5].outwardLinks[&2].last_updated",
      },
      "outwardIssue": {
        "fields": {
            "issuetype": {
                "name": "[&7].inwardLinks[&4].outward_object_type"
            }
        },
        "key": "[&5].inwardLinks[&2].outward_key",
        "@(1,type.id)": "[&5].inwardLinks[&2].fieldDef.link_type_id",
        "@(4,key)": "[&5].inwardLinks[&2].inward_key",
        "@(4,updated)": "[&5].inwardLinks[&2].last_updated",
      }
}};

spec["*"].fields.issuelinks["*"].inwardIssue["#" + object_type] =  ["[&5].outwardLinks[&2].outward_object_type","[&5].outwardLinks[&2].fieldDef.object_type"];
spec["*"].fields.issuelinks["*"].outwardIssue["#" + object_type] = [ "[&5].inwardLinks[&2].inward_object_type","[&5].inwardLinks[&2].fieldDef.object_type"];
spec["*"].fields.issuelinks["*"].inwardIssue["#" + system] =  "[&5].outwardLinks[&2].fieldDef.system_ident";
spec["*"].fields.issuelinks["*"].outwardIssue["#" + system] =  "[&5].inwardLinks[&2].fieldDef.system_ident";

for (var i=0; i<fields.length; i++){
    //If this is a field with an issuelink
    if (fields[i].id !== 'issuelinks'){
       var fieldPrefix = "[&3].fields[" + i + "]";
       spec["*"].fields[fields[i].id] = {};
       var user_attr = fields[i].user_attribute || null, sys_attr = fields[i].system_attribute || null; 
        log.debug('user ' + user_attr + sys_attr);
        if (user_attr && user_attr != fields[i].id ){
           // spec["*"].fields[fields[i].id][user_attr] = fieldPrefix + ".user_value";
            var user_attr_arr = user_attr.split(".");
            var obj = spec["*"].fields[fields[i].id];
            obj[user_attr_arr[0]] = fieldPrefix + ".user_value";
            if (user_attr_arr.length > 1){ //This should never be nested more than 2 deep.
                obj[user_attr_arr[0]] = {};
                //Since this brings the spec one level down, we need to do the &4 thing.
                obj[user_attr_arr[0]][user_attr_arr[1]] = "[&4].fields[" + i + "]" + ".user_value";
            }
            if (fields[i].id === "status"){
                if (user_attr === "name"){
                    obj[user_attr] = [fieldPrefix + ".user_value",fieldPrefix + "._invalid"];
                } else {
                    obj.name = fieldPrefix + "._invalid";
                }    
            } 
        } 
        
        if (sys_attr && fields[i].sys_attr != fields[i].id ){
            spec["*"].fields[fields[i].id][sys_attr] = fieldPrefix + ".system_value";
        } 
        if (user_attr === null && sys_attr === null){
            spec["*"].fields[fields[i].id]["@"] = [fieldPrefix + ".user_value",fieldPrefix + ".system_value"];
        } 
        if (sys_attr !== null && sys_attr === user_attr){
            spec["*"].fields[fields[i].id][sys_attr] = [fieldPrefix + ".user_value",fieldPrefix + ".system_value"];
        }
        if (fields[i].name === "Sprint"){
            spec["*"].fields[fields[i].id] = {};
            spec["*"].fields[fields[i].id]["0"] = [fieldPrefix + ".user_value",fieldPrefix + ".system_value"];
            
        }
       // We need to do this last for the field so that we can clean up if there are multiple matches   
       spec["*"].fields[fields[i].id]["@(1,updated)"] = fieldPrefix + ".last_updated";
       spec["*"].fields[fields[i].id]["#" + fields[i].ident] = fieldPrefix + ".field_ident"; 
     
    } 
}
log.debug("buildTransformPayloadToObjectSpec spec: " + JSON.stringify(spec));
return spec;
