log.debug('_transformArtifacts incoming request payload: ' + req.json);
var obj = JSON.parse(req.json),
    syncConfigIdent = obj.syncConfigIdent;

var syncConfig = SysUtility.getResource('syncConfig',{sysfilter: "equal(ident:" + syncConfigIdent + ")"});
if (syncConfig && syncConfig.length > 0){
    syncConfig = syncConfig[0];
} else {
    var msg = "Sync Config " + syncConfigIdent + " not found.";
    log.error(msg);
    throw (msg);
}

var spec = SysUtility.getFunction('buildTransformPayloadSpec',{system_ident: syncConfig.system_ident, object_type: syncConfig.object_type}),
    input = JSON.stringify(obj.results);

var tUtil = Java.type("com.agilecentral.integration.utility.JsonUtility");
log.debug('_transformArtifacts -- before transform spec: ' + spec);
log.debug('_transformArtifacts -- transform input: ' +  input);

var payload = tUtil.transformString(spec,input);
log.debug('payload => ' + payload);

payload = JSON.parse(payload);
var current_time = moment().toISOString();

_.each(payload, function(o){
    o['@metadata'] = {"action":"MERGE_INSERT"};
    if (o.object_type === "Sprint"){
        o.last_updated = current_time;
    }
    o.fields = _.reduce(o.fields, function(arr,f){
        log.debug(JSON.stringify(f));
        if (f){
            f['@metadata']={"action":"MERGE_INSERT"};  
            f.last_updated = o.last_updated;
            f.user_value = f.user_value || null; //We need to put these in here to manage when a field is null;
            f.system_value = f.system_value || null; 
            f.revision = o.revision; 
            arr.push(f);
        }
        return arr; 
    },[]);
    o.collections = _.reduce(o.collections, function(arr,c){
        if (c){
            c['@metadata']={"action":"MERGE_INSERT"}
            c.last_updated = o.last_updated;
            arr.push(c);    
        }
        return arr; 
    },[]);
});

log.debug('_transformArtifacts transformed payload: ' + JSON.stringify(payload));
return payload;
