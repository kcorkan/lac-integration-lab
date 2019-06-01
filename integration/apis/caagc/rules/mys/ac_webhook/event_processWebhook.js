if (row.status_id > 0){ return; }

//The webhook AttributeMap is used to map field attributes to what is returned in teh webhook 
//since this appears to be different than what is returned when we fetch from API.  
var webhookAttributeMap = {
    "_ref":"ref",
    "Name":"name",
    "ObjectUUID":"id",
    "_type":"object_type"
};

try {
    var payload = JSON.parse(row.payload),
      webhook_id = row.caller;
    
var system = SysUtility.getResource('system',{sysfilter: "equal(webhook_id:'" + webhook_id + "')"});
if (!system){
    row.status_message = "Ignoring webhook becuase system with webhook_id not found: " + webhook_id;
    row.status_id = 1; 
    log.warning(row.status_message);
    return;
}

var user = payload && payload.message && payload.message.transaction && payload.message.transaction.user && payload.message.transaction.user.username;
if (!user){
    row.status_message = "Ignoring changes because the user is unknown.";
    row.status_id = 1;
    log.warning(row.status_message);
    return; 
}

if (user && system.username.toLowerCase() === user.toLowerCase()){
    row.status_message = "Ignoring changes because integration user made the update.";
    row.status_id = 1;
    log.warning(row.status_message);
    return; 
}    

var state = payload.message && payload.message.state,
    action = payload.message && payload.message.action,
    object_type = payload.message && payload.message.object_type;
    
if (!object_type){
    row.status_message = "Ignoring webhook becuase object type not found in payload.";
    row.status_id = 1;
    log.warning(row.status_message);
    return;
} 

var sync_cfg = SysUtility.getResource('syncConfig',{sysfilter: ["equal(system_ident:" + system.ident + ")", "equal(object_type:'" + object_type + "')"]});
if (!sync_cfg || sync_cfg.length === 0){
    row.status_message = "Ignoring webhook becuase no sync configuration found for object_type " + object_type + " and system_ident " + system.ident + ".";
    row.status_id = 1;
    log.warning(row.status_message);
    return;
}     
log.info('sync_fg' + JSON.stringify(sync_cfg));
sync_cfg = sync_cfg[0];

var authHeaders = gCFG.authHeaders;
var obj = {
    "object_type": object_type,
    "object_uuid": payload.message && payload.message.object_id,
    "system_ident": system.ident,
    "deleted": null,
    "@metadata": {"action":"MERGE_INSERT"},
    "fields": []
};
log.info("Process Webhook: " + action + ' ' + JSON.stringify(obj));
switch(action.toLowerCase()){
    case "deleted":
       obj.deleted = moment(data.last_updated).toISOString(); 
       obj.last_updated = obj.deleted;
       row.status_id = 2;
       break;
    case "created":
    case "updated":
    
        var spec = SysUtility.getResourceAsString('_transformSpecWebhookState'),
            input = JSON.stringify(state);
                
        var tUtil = Java.type("com.agilecentral.integration.utility.JsonUtility");
        var data = tUtil.transformString(spec,input);
        log.info('data' + data);
        data = JSON.parse(data);     
        obj.last_updated = data.LastUpdateDate || row.received_date;
        obj.object_key = data.FormattedID; 
        
       
        _.each(sync_cfg.fields, function(f){
            var fd = f.fieldDef;
             if (fd.id in data){
                 var val = data[fd.id],
                    system_attr = webhookAttributeMap[fd.system_attribute] || fd.system_attribute,
                    user_attr = webhookAttributeMap[fd.user_attribute] || fd.user_attribute;
               
                
                if ((system_attr && !(system_attr in val)) || (user_attr && !(user_attr in val))){
                    //This attribute may have not been returned in the list, so we need to get the object 
                    log.info('lookup up object');
                    var fullObj = SysUtility.restPost(req.fullBaseURL + 'lookupByRef',null,gCFG.authHeaders,{"ref": val.ref, "object_type": val.object_type, "system": system.ident});
                    if (fullObj){
                        log.info('fullObj ' + fullObj);
                        fullObj = JSON.parse(fullObj);
                        val = _.extend(val, fullObj);
                    }
                    log.info('updated obj ' + JSON.stringify(val));

                }
                log.info(fd.id + system_attr + user_attr + f.ac_field_def_ident + val[system_attr] + val[user_attr]);    
                 obj.fields.push({
                     field_ident: f.ac_field_def_ident,
                     system_value: system_attr ? val && val[system_attr] : val,
                     user_value: user_attr ? val && val[user_attr] : val,
                     last_updated:  obj.last_updated,
                     "@metadata": {"action": "MERGE_INSERT"}
                 });
             }
        });
        obj = [obj];
        log.info('_fromAgileCentral payload: ' + JSON.stringify(obj));
        var putRes = SysUtility.restPut(req.fullBaseURL + '_fromAgileCentral',null,authHeaders,obj);
        log.debug('putRes: ' + putRes);
        
        row.status_id = 2;
        break; 
 
    default: 
        row.status_message = "Ignoring webhook becuase webhook event not recognized: " + action;
        log.warning(row.status_message);
        row.status=1;
    }

} catch (e){
    row.status_id = 3;
    row.status_message = "Error -- " + e;
    log.error(row.status_message);
}
