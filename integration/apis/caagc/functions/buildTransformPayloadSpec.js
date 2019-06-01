var system = parameters.system_ident,
object_type = parameters.object_type;

var fields = SysUtility.getResource('fieldDefinitions',{sysfilter: ["equal(system_ident:" + system + ")","equal(object_type:'" + object_type + "')"]});

    var spec = {

    "*": {
      "_refObjectUUID": "[&1].object_uuid",
      "_type": "[&1].object_type",
      "FormattedID": "[&1].object_key"
    }
};

spec["*"]["#" + fields[0].system_ident]="[&1].system_ident";
spec["*"].LastUpdateDate = "[&1].last_updated";
spec["*"]._objectVersion = "[&1].revision";
for (var i=0; i<fields.length; i++){
    
    var fieldPrefix = "[&1].fields[" + i + "]";
    if (fields[i].attribute_type && fields[i].attribute_type.toUpperCase()=== "COLLECTION"){
        
    } else {
 //     spec["*"].LastUpdateDate.push(fieldPrefix + ".last_updated");
//        spec["*"]._objectVersion.push(fieldPrefix + ".revision");
        spec["*"][fields[i].id] = {};
        spec["*"][fields[i].id]["@(1,_objectVersion)"] = fieldPrefix + ".revision";
        spec["*"][fields[i].id]["@(1,LastUpdateDate)"] = fieldPrefix + ".last_updated";

    }


   
    fieldPrefix = "[&2].fields[" + i + "]";
    if (!fields[i].user_attribute && !fields[i].system_attribute){
        spec["*"][fields[i].id]["@(1," + fields[i].id +")"] = [fieldPrefix + ".user_value",fieldPrefix + ".system_value"];
    } 
    if (fields[i].attribute_type && fields[i].attribute_type.toUpperCase() === "COLLECTION"){
        spec["*"][fields[i].id] = {"*": {}};
        spec["*"][fields[i].id]["*"][fields[i].user_attribute]= "[&3].collections[&1].user_value";
        spec["*"][fields[i].id]["*"][fields[i].system_attribute]= "[&3].collections[&1].system_value";
        spec["*"][fields[i].id]["*"]["#" + fields[i].ident] = "[&3].collections[&1].field_ident";
    } else {
        if (fields[i].user_attribute && fields[i].user_attribute != fields[i].id ){
            spec["*"][fields[i].id][fields[i].user_attribute] = fieldPrefix + ".user_value";
        } 
        
        if (fields[i].system_attribute && fields[i].system_attribute != fields[i].id ){
            spec["*"][fields[i].id][fields[i].system_attribute] = fieldPrefix + ".system_value";
        } 
        spec["*"][fields[i].id]["#" + fields[i].ident] = fieldPrefix + ".field_ident";
    }
}

log.info("[Agile Central API][Function:buildTransformPayloadSpec] " + JSON.stringify(spec));
return spec;
