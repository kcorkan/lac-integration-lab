//trasnform json to jiraObject
if (req.verb !== "POST" || !req.json){
    return {
        statusCode: 500,
        errorMessage: "[Jira API][Resource: reaction] requires a POST with a valid payload."
    };
}

var obj = JSON.parse(req.json); 
obj["@metadata"] = {"action":"MERGE_INSERT"};

var system_ident = obj.system_ident,
    object_type = obj.object_type,
    target_data = JSON.parse(obj.target_data),
    last_updated = obj.last_updated;

var field_defs = SysUtility.getResource('fieldDefinitions', {sysfilter: ["equal(system_ident:" + system_ident + ")","equal(object_type:'" + object_type + "')"]});

var fields = [],
    inwardLinks = [],
    outwardLinks = [],
    warnings = [],
    errors = [];

if (!obj.deleted && (!target_data || _.isEmpty(target_data) === true )){ throw("[Jira API][Resource: reaction] target_data attribute is empty");}

_.each(target_data, function(value, fieldName){
    var fieldDef = _.find(field_defs, function(fd){
        return fd.name.toLowerCase() === fieldName.toLowerCase() || 
                fd.id.toLowerCase() === fieldName.toLowerCase()||
                fd.inward && fd.inward.toLowerCase() === fieldName.toLowerCase() ||  
                fd.outward && fd.outward.toLowerCase() === fieldName.toLowerCase();
    });
    
    log.debug('[Jira API][Resource: reaction] fieldName ' + fieldName + ": " + value);
    log.debug('[Jira API][Resource: reaction] fieldDef ' + JSON.stringify(fieldDef));
    
    if (fieldDef){
        if (fieldDef.inward === fieldName){
            if (!_.isArray(value)){ value = [value]; }
            _.each(value, function(v){
                inwardLinks.push({
                    inwardObject: {
                        "@metadata": {"action": "LOOKUP"},
                        "object_key": v,
                        "system_ident": system_ident
                    },
                    field_ident: fieldDef.ident,
                    last_updated: last_updated,
                    "@metadata": {"action": "MERGE_INSERT"}
                });
            });
        }
            
        if (fieldDef && fieldDef.outward === fieldName){
            if (!_.isArray(value)){ value = [value]; }
             _.each(value, function(v){
                outwardLinks.push({
                    outwardObject: {
                        "@metadata": {"action": "LOOKUP"},
                        "object_key": v,
                        "system_ident": system_ident
                    },
                    field_ident: fieldDef.ident,
                    last_updated: last_updated,
                    "@metadata": {"action": "MERGE_INSERT"}
                });
            });
        }
            
        if (fieldDef.name === fieldName){
            fields.push({
                field_ident: fieldDef.ident,
                user_value: value,
                last_updated: last_updated,
                "@metadata": {"action": "MERGE_INSERT"}
                
            });
        }
    }
});

delete obj.target_data;
obj.fields = fields;
obj.inwardLinks = inwardLinks;
obj.outwardLinks = outwardLinks;

log.debug("[Jira API][Resource: reaction] jiraObject: " + JSON.stringify(obj));

var resp = SysUtility.restPut(req.fullBaseURL + '_toJira',null,gCFG.authHeaders,obj);
log.debug('[Jira API][Resource: reaction] response from _toJira POST ' + resp);
resp = JSON.parse(resp);
if (resp && resp.statusCode > 299){
    log.info(JSON.stringify(resp));
    errors.push(resp);
}

if (errors.length > 0){
    return {
        statusCode: 500,
        warnings: warnings,
        errorMessage: errors.join(',')
    };    
} else {
    var object_id = null,
        last_updated = null; 
    if (resp.txsummary && resp.txsummary.length > 0){
        var jiraObj = _.find(resp.txsummary, function(t){
            return t["@metadata"].resource === "_toJira";
        });
        if (jiraObj){
            object_id = jiraObj.object_key;
            last_updated = jiraObj.last_updated; 
        }
        log.debug('[Jira API][Resource: reaction] object_id' + object_id + JSON.stringify(resp.txsummary));
    }
    return {
        statusCode: 200,
        object_id: object_id,
        last_updated: last_updated
    };
}

