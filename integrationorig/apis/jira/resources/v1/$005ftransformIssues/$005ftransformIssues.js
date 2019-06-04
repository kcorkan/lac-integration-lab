log.debug('_transformIssues payload: ' + req.json);
var obj = JSON.parse(req.json),
    syncConfigIdent = obj.syncConfigIdent;

var syncConfig = SysUtility.getResource('syncConfig',{sysfilter: "equal(ident:" + syncConfigIdent + ")"});
if (syncConfig && syncConfig.length > 0){
    syncConfig = syncConfig[0];
} else {
    throw ("Sync Config " + syncConfigIdent + " not found.");
}

var spec = SysUtility.getFunction('buildTransformPayloadToObjectSpec',{system: syncConfig.system_ident, object_type: syncConfig.object_type}),
    input = JSON.stringify(obj.issues),
    linkFieldDefs = _.find(syncConfig.fields, function(f){
        return f.link_type_id > 0;
    });

var tUtil = Java.type("com.agilecentral.integration.utility.JsonUtility");
log.debug('_updateIssues transform spec: ' + spec);
log.debug('_updateIssues transform input: ' + input);

var payload = tUtil.transformString(spec,input);
log.debug('_updateIssues transform output => ' + payload);
payload = JSON.parse(payload);

_.each(payload, function(o){
    o['@metadata'] = {"action":"MERGE_INSERT","key":["object_id","object_type","system_ident"]};
    //Add the metadata action tag and also strip out any nulls or non-populated fields.
    o.fields = _.reduce(o.fields, function(arr, f){
         if (f && f._invalid && (f._invalid === syncConfig.invalid_status || f._invalid === syncConfig.blocked_status)){
           f.user_value = f._invalid;
         }
         if (f && f.field_ident){
            delete f._invalid;
            f['@metadata']={"action":"MERGE_INSERT"};    
            arr.push(f);
        }
        return arr;
    },[]);
       
    o.inwardLinks = _.reduce(o.inwardLinks, function(arr,link){
        if (link !== null){
            link['@metadata'] = {"action":"MERGE_INSERT"};
         
             var fd = _.find(linkFieldDefs, function(d){
                return parseInt(d.link_type_id) === parseInt(link.fieldDef.link_type_id);
            });
             log.debug('found fd' + JSON.stringify(fd));
            //Only keep this if we are interested.
            if (fd){
                link.field_ident = fd.ident; 
                delete link.fieldDef;
                arr.push(link);
                log.debug('found link' + JSON.stringify(link));
            }
        }
        return arr;
    },[]);
       o.outwardLinks = _.reduce(o.outwardLinks, function(arr,link){
        if (link !== null){
            link['@metadata'] = {"action":"MERGE_INSERT"};
            var fd = _.find(linkFieldDefs, function(d){
                return parseInt(d.link_type_id) === parseInt(link.fieldDef.link_type_id);
            });
            //Only keep this if we are interested.
            if (fd){
                link.field_ident = fd.ident; 
                delete link.fieldDef;
                arr.push(link);
            }
        }
        return arr;
    },[]);

});
log.debug('_transformIssues transformed payload: ' + JSON.stringify(payload));
return payload;

