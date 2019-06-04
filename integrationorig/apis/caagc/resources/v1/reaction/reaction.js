//trasnform json to jiraObject
if (req.verb !== "POST" || !req.json){
    var msg = "[Agile Central API][Resource:reaction] requires a POST with a valid payload.";
    log.error(msg);
    throw (msg);
}

var obj = JSON.parse(req.json); 
if (_.isEmpty(obj)){
    var msg = "[Agile Central API][Resource:reaction] Empty payload.";
    log.error(msg);
    throw (msg);
}

obj["@metadata"] = {"action":"MERGE_INSERT"};

//Begin Validations of payload data 
var system_ident = obj.system_ident,
    object_type = obj.object_type,
    last_updated = obj.last_updated,
    target_data = obj.target_data && JSON.parse(obj.target_data); 
    
log.debug('[Agile Central API][Resource:reaction] target_data ' + JSON.stringify(target_data) + _.isEmpty(target_data));
if (!system_ident){ 
    var msg = "[Agile Central API][Resource:reaction] No System Ident provided to Reaction";
    log.error(msg);
    throw(msg);
}
if (!object_type){
    var msg = "[Agile Central API][Resource:reaction] No Object Type provided to Reaction";
    log.error(msg);
    throw(msg);
}
if (!obj.deleted && (!target_data || _.isEmpty(target_data) === true )){ throw("[Agile Central API][Resource:reaction] target_data attribute is empty");}

var field_defs;
try { 
    field_defs = SysUtility.getResource('fieldDefinitions', {sysfilter: ["equal(system_ident:" + parseInt(system_ident) + ")","equal(object_type:'" + object_type + "')"]});
} catch(e){ 
    var msg = "[Agile Central API][Resource:reaction] Error finding fieldDefinitions for system [" + system_ident + "] and object_type [" + object_type + "]: " + e;
    log.error(msg); 
    throw(msg); }
if (!field_defs || field_defs.length === 0){ 
    var msg = "[Agile Central API][Resource:reaction] No field defs found for [" + system_ident + "] and [" + object_type + "]";
    log.error(msg); 
    throw(msg); 
}


//Now only store mapped data for the configuration in reaction.
var fields = [],
    collections = [],
    errors = [];

    _.each(target_data, function(value, fieldName){
        log.debug('[Agile Central API][Resource:reaction] field ' + fieldName + "= " + value);
        
        var fieldDef = _.find(field_defs, function(fd){
            return fd.name.toLowerCase() === fieldName.toLowerCase() || fd.id.toLowerCase() === fieldName.toLowerCase();
        });
        
        if (fieldDef){
            log.debug("[Agile Central API][Resource:reaction] " + JSON.stringify(fieldDef));
            if (fieldDef.attribute_type && fieldDef.attribute_type.toLowerCase() === "collection"){
                if (!_.isArray(value)){ value = [value]; }
             _.each(value, function(v){
                    collections.push({
                        "user_value": v ,
                        "@metadata": {"action":"MERGE_INSERT"},
                        "field_ident": fieldDef.ident, 
                        "last_updated": last_updated
                    });    
                });
            } else {
                fields.push({
                    field_ident: fieldDef.ident,
                    last_updated: last_updated,
                    user_value: value,
                    "@metadata": {"action":"MERGE_INSERT"}
                });
            }
        } else {
            log.warning("[Agile Central API][Resource:reaction] no field_def found for " + fieldName)
        }
    });

    delete obj.target_data; 
    obj.fields = fields;
    obj.collections = collections; 
    
    if (obj.reconcile_id){
        //TODO: what if the object_id already exists with another xref_id? 
        //TODO: what if something already exists with that xref_id? - throw an error for now 
        //For now, we throw an error, if we want a different behavior, then we can update this depending on expectation
        var exists = SysUtility.getResource('acObject',{sysfilter: "equal_or(object_uuid:'" + obj.reconcile_id + "', xref_id:'" + obj.xref_id +"')"});
        if (exists && exists.length > 0){
            log.error("[Agile Central API][Resource:reaction] Cannot reconcile " + obj.reconcile_id + " for xref " + obj.xref_id + " becuase the object_id or xref_id is associated with another jira object.");
            throw "[Agile Central API][Resource:reaction] Cannot reconcile " + obj.reconcile_id + " for xref " + obj.xref_id + " becuase the object_id or xref_id is associated with another jira object.";    
        }
        obj.object_uuid = obj.reconcile_id;
        obj.object_key = obj.object_key;
        delete obj.reconcile_id;
    }

    log.debug('[Agile Central API][Resource:reaction] _toAgileCentral ' + JSON.stringify(obj));

if (!obj.deleted && fields.length === 0 && collections.length === 0){
    log.error("[Agile Central API][Resource:reaction] No mappable fields or collections.");
    return {
        statusCode: 500,
        warnings: [],
        errorMessage: "[Agile Central API][Resource:reaction] No mappable fields or collections."
    }; 
}

var resp = SysUtility.restPut(req.fullBaseURL + '_toAgileCentral',null,gCFG.authHeaders,obj);
log.debug('[Agile Central API][Resource:reaction] response from _toAgileCentral POST ' + resp);
resp = JSON.parse(resp);

if (resp && resp.statusCode > 299){
    log.info(JSON.stringify(resp));
    errors.push(resp);
}

if (errors.length > 0){
    log.error(errors.join(','));
    return {
        statusCode: 500,
        warnings: warnings,
        errorMessage: errors.join(',')
    };    
} else {
    var object_id = null,
        last_updated = null; 
    if (resp.txsummary && resp.txsummary.length > 0){
        var acObj = _.find(resp.txsummary, function(t){
            return t["@metadata"].resource === "_toAgileCentral";
        });
        if (acObj){
            object_id = acObj.object_uuid;
            last_updated = acObj.last_updated; 
        }
        log.debug('[Agile Central API][Resource:reaction] object_id: ' + object_id + JSON.stringify(resp.txsummary));
    }
    return {
        statusCode: 200,
        object_id: object_id,
        last_updated: last_updated
    };
}

