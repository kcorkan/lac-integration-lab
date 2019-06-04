var decodedField = decodeURI(parameters.field);

var foundField; 
if (parameters.objectType.toLowerCase() === "sprint"){
    
    var sprintFields = SysUtility.getResource('sprintFields');
    
    var fieldRe = RegExp("^" + decodedField + "$","i");
    foundField = _.find(sprintFields, function(field){
        return fieldRe.test(field.id) || fieldRe.test(field.name);
    });

    
} else {
    var url = [row.url,'rest/api/2/field'].join('/');
    var params = {};
    var authHeaders = SysUtility.getFunction('getAuthHeaders',{system: row.ident});
    authHeaders = JSON.parse(authHeaders);
    var fields = SysUtility.restGet(url,params,authHeaders);
    
    var fieldRe = RegExp("^" + decodedField + "$","i");
    log.debug('[Jira API][validateField] decodedField' + decodedField+ fields);
    fields = JSON.parse(fields);
    var foundField = _.find(fields, function(field){
        log.debug('field.id' + field.id);
        return fieldRe.test(field.id) || fieldRe.test(field.name);
    });
    
    if (!foundField){
        //Check issue links 
        var url = [row.url,'rest/api/2/issueLinkType'].join('/');
        var authHeaders = SysUtility.getFunction('getAuthHeaders',{system: row.ident});
        authHeaders = JSON.parse(authHeaders);
        var issueLinkTypes = SysUtility.restGet(url,params,authHeaders);
        
        issueLinkTypes = JSON.parse(issueLinkTypes);
        log.debug('[Jira API][validateField] issuelinktypes ' + JSON.stringify(issueLinkTypes));
        foundField = _.find(issueLinkTypes.issueLinkTypes, function(linkType){
            log.debug('link' + JSON.stringify(linkType));
            return fieldRe.test(linkType.name) || fieldRe.test(linkType.inward) || fieldRe.test(linkType.outward);
        });
        log.debug('[Jira API][validateField] found' + JSON.stringify(foundField));
        if (foundField){
            foundField.link_type_id = foundField.id;
            foundField.id = "issuelinks";
            foundField.schema = {"type": "array"}; 
        }
    }

}

if (foundField){
    
    var schema = foundField.schema && foundField.schema.type; 
    //We need a way to indicate that a field def is the epic link so we will make the gh class the schema type for this type only.
    if (foundField.schema && foundField.schema.custom && foundField.schema.custom === 'com.pyxis.greenhopper.jira:gh-epic-link'){
        schema = 'gh-epic-link';
    }
    
    //Add to system
    var data = {
            "@metadata": {"action":"MERGE_INSERT"},
            "id": foundField.id,
            "name": foundField.name,
            "schema_type": schema,
            "object_type": parameters.objectType,
            "system_ident": row.ident,
            "inward": foundField.inward || null,
            "outward":foundField.outward || null,
            "link_type_id": foundField.link_type_id || null
        };
    
    if ( foundField.name.toLowerCase() == "description" ) {
        data.schema_type = "wiki";
    }
    var resp = SysUtility.restPut(req.fullBaseURL + 'fieldDefinitions',null,gCFG.authHeaders,data);
    //todo check for errors here.
    log.debug('[Jira API][validateField] ' + resp);
    return data;  
}
return {}; 
