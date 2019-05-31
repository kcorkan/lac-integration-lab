var actionData = SysUtility.getResource('acObject',{sysfilter: ["equal(ident:" + row.ac_object_ident + ")"], inlinelimit: 32000 });

if (actionData && actionData.length > 0){
    actionData = actionData[0];
}

if ((!actionData.fields || actionData.fields.length === 0) && (!actionData.collections || actionData.collections.length === 0)){
    row.status_message = "[Agile Central API][Rule:Update Agile Central] No updated data for action.";
    log.debug(row.status_message);
    return;
}

//get system info from action data 
var url = [actionData.system.url, actionData.object_type, actionData.object_uuid || 'create'].join('/');

//Get the auth headers.  Typically this will return the auth headers with an API key, but in instances where an API key isn't available, it will return a security token that needs to be passed into the url, not into the headers.  
var system_ident = actionData.system.ident;
var headers = SysUtility.getFunction('getAuthHeaders',{system: system_ident});
headers = JSON.parse(headers);

var action = row.action;
var re = /DELETE/i;
if (action.match(re)){
    var resp = SysUtility.restDelete(url,null,headers); 
    log.debug('[Agile Central API][Rule:Update Agile Central] action response' + resp);
    row.status_message = resp;
    resp = JSON.parse(resp);
    if (resp === null || resp.OperationResult && resp.OperationResult.Errors.length > 0){
         var msg = "[Agile Central API][Rule:Update Agile Central] Error updating Agile Central: " + resp && resp.OperationResult && resp.OperationResult.Errors.join(',');
         throw (msg);
    }
    return;
}


//transform action data 
var spec = SysUtility.getResourceAsString('transformSpec'),
    input = JSON.stringify(actionData),
    tUtil = Java.type("com.agilecentral.integration.utility.JsonUtility");

log.debug('[Agile Central API][Rule:Update Agile Central] Update Agile Central => before transform ' + spec + input);
var payload = tUtil.transformString(spec,input);
log.debug("[Agile Central API][Rule:Update Agile Central] " + url + ' => ' + payload);
payload = JSON.parse(payload);

//Strip out timeboxes, if we are updating them -- if they are null then they don't need to be deleted from the payload.
var iteration = null, release = null; 
if (payload[actionData.object_type].Iteration){
    iteration = payload[actionData.object_type].Iteration;
    delete payload[actionData.object_type].Iteration;
}
if (payload[actionData.object_type].Iteration === null){ //update this becuase the rest api seems to choke on null if its not in quotes.
    payload[actionData.object_type].Iteration = "";
}

if (payload[actionData.object_type].Release){
    iteration = payload[actionData.object_type].Release;
    delete payload[actionData.object_type].Release;
}

if (payload[actionData.object_type].Release === null){
    payload[actionData.object_type].Release = "";
}


//send rest call 
var resp = null;
if (row.action !== 'DELETE'){
    row.payload = JSON.stringify(payload);
    log.debug('[Agile Central API][Rule:Update Agile Central] payload ' + row.payload);
    if (!headers.headers.ZSessionID){
        resp = SysUtility.getFunction('doSecurityTokenPost',{system_ident: system_ident, url: url, payload: payload});
    } else {
        resp = SysUtility.restPost(url,null,headers,payload); 
    }
    log.debug('[Agile Central API][Rule:Update Agile Central] action response' + resp);
    
    row.status_message = resp;
    resp = JSON.parse(resp);
    resp = resp.CreateResult || resp.OperationResult || null;
    if (resp === null || resp.Errors.length > 0){
        //HANDLE ERROR
         var msg = "[Agile Central API][Rule:Update Agile Central] Error updating Agile Central: " + resp && resp.Errors.join(',');
         log.error(msg);
         throw (msg);
    }
    
    if (resp.Object){
        if (resp.Object.ObjectUUID){
            var objParent = row.getParent('ac_object');
            objParent.object_uuid = resp.Object.ObjectUUID;
            objParent.revision = resp.Object._objectVersion
            objParent.object_key = resp.Object.FormattedID;
        }
        var updateUrl = resp.Object._ref;
        
/**********************************************************
 * Update Project dependent timeboxes, if they were there 
 **********************************************************/
        if (iteration || release){
            var projectRef = resp.Object.Project._ref,
                timeboxPayload = {};
            log.debug('[Agile Central API][Rule:Update Agile Central] updating iterations ' + iteration + updateUrl + projectRef);
                
            if (iteration && (resp.Object.Iteration === null || resp.Object.Iteration._refObjectName !== iteration)){
                //update iteration 
                 log.debug('[Agile Central API][Rule:Update Agile Central] updating iterations inside ' + "((Name = \"" + iteration + "\") AND (Project = \"" + projectRef + "\"))");
                var iterationObj = SysUtility.restPost(req.fullBaseURL + 'lookupByQuery',null,gCFG.authHeaders, {
                    type: 'Iteration',
                    system: system_ident,
                    query: "((Name = \"" + iteration + "\") AND (Project = \"" + projectRef + "\"))"
                });
                if (iterationObj){
                    iterationObj = JSON.parse(iterationObj);
                    if (iterationObj){
                        timeboxPayload.Iteration = iterationObj._ref; 
                    }    
                } else {
                    //TODO: log error somewhere that iteartion not found, but don't throw an error becuase 
                    //the object was already created. 
                    log.warning('[Agile Central API][Rule:Update Agile Central] Iteration Not found for project: ' + iteration);
                }
            }
            if (release && (resp.Object.Release === null || resp.Object.Release._refObjectName !== release)){
                //update release 
                var obj = SysUtility.restPost(req.fullBaseURL + 'lookupByQuery',null,gCFG.authHeaders, {
                    type: 'Release',
                    system: system_ident,
                    query: "((Name = \"" + release + "\") AND (Project = \"" + projectRef + "\"))"
                });
                if (obj){
                   obj = JSON.parse(obj);
                   timeboxPayload.Release = obj._ref; 
                }
            }
            if (!_.isEmpty(timeboxPayload)){
                var updatePayload = {};
                updatePayload[actionData.object_type] = timeboxPayload;
                if (!headers.headers.ZSessionID){
                    resp = SysUtility.getFunction('doSecurityTokenPost',{system_ident: system_ident, url: updateUrl, payload: updatePayload});
                } else {
                    resp = SysUtility.restPost(updateUrl,null,headers,updatePayload); 
                }
                log.debug('[Agile Central API][Rule:Update Agile Central] timeboxUpdate: ' + resp);
            }
        }
        
/**********************************************************
 * END -- Update Project dependent timeboxes
 **********************************************************/

        if (actionData.collections && actionData.collections.length > 0){
            //Now update collections 
            var spec = SysUtility.getResourceAsString('transformCollectionSpec'),
                input = JSON.stringify(actionData);
            
            var tUtil = Java.type("com.agilecentral.integration.utility.JsonUtility");
            log.debug('[Agile Central API][Rule:Update Agile Central] before collection trasnform ' + spec + input);
            var cPayload = tUtil.transformString(spec,input);
            log.debug('[Agile Central API][Rule:Update Agile Central] Collections to Update => ' + cPayload);
            cPayload = JSON.parse(cPayload);
            
            _.each(cPayload, function(val,key){
                 var colUrl = resp.Object[key] && resp.Object[key]._ref;
                 if (colUrl){
                     colUrl = colUrl + '/add';
                     colPayload = val;
                     if (!headers.headers.ZSessionID){
                        resp = SysUtility.getFunction('doSecurityTokenPost',{system_ident: system_ident, url: colUrl, payload: colPayload});
                    } else {
                        resp = SysUtility.restPost(colUrl,null,headers,colPayload); 
                    }
                    log.debug('[Agile Central API][Rule:Update Agile Central] collection (' + colUrl + ') response ' + resp);
                 } else {
                     //ERROR updating colelction 
                     log.warning("[Agile Central API][Rule:Update Agile Central] No colUrl found for " + val + ": " + key);
                 }
            });            
        }

   }
    //todo check for errors on operation result
    return;
    
} else {
    log.info("[Agile Central API][Rule:Update Agile Central] DELETE not supported.")
}

//Process Response 
if (resp){
    if (resp.Errors && resp.Errors.length > 0){
        var msg = "[Agile Central API][Rule:Update Agile Central] Error from Agile Central: " + resp.Errors.join(',');
        log.error(msg);
        throw (msg);
    }
} else {
    log.error("[Agile Central API][Rule:Update Agile Central] No Response from Agile Central.");
    throw ("[Agile Central API][Rule:Update Agile Central] No Response from Agile Central.");
}
