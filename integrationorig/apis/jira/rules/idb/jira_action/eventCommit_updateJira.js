
var actionData = SysUtility.getResource('changedObjectData',{sysfilter: ["equal(ident:" + row.jira_object_ident + ")"], inlinelimit: 32000 });
if (!actionData || actionData.length === 0){
    log.warning("[Jira API][Rule: Create JIRA Object And Update JIRA Fields] No data found for object_ident " + row.jira_object_ident);
    return; 
}

actionData = actionData[0];
var object_id = actionData.object_id;
var issue_url = actionData.system.url + "/rest/api/2/issue/";
var sprint_url = actionData.system.url + "/rest/agile/1.0/sprint";

var specName = 'transformSpecJiraIssuePayload';
if (actionData.object_type.toLowerCase() == "sprint"){
    specName = 'transformSpecJiraSprintPayload';
}

var objParent = row.getParent('jira_object');

var headers = SysUtility.getFunction('getAuthHeaders',{system: actionData.system.ident});
headers = JSON.parse(headers);

if (object_id){
    var action = row.action;
    var re = /DELETE/i;
    if (action.match(re)){  //DELETE STUFF 
        
        var resp = null;
        try{
            resp = SysUtility.restDelete(issue_url + object_id);
        } catch(e){
            //This is likely OK because a successful restDelete returns a null, which causes a null pointer exception in LAC.
            if (!e.toString().match(/java.lang.NullPointerException/)){
               log.error('[Jira API][Rule: Create JIRA Object And Update JIRA Fields] restDelete response from Jira: ' + e);
               throw ("[Jira API][Rule: Create JIRA Object And Update JIRA Fields] Error deleting object_id [" + object_id + "] " + e.toString()); 
            }
        }
        if (resp){
             resp = JSON.parse(resp);
             //Process response, we only get a response if something went wrong.
             if (resp.errorMessages && resp.errorMessages.length > 0){
                 var errors = resp.errorMessages.join(',');
                 log.error('[Jira API][Rule: Create JIRA Object And Update JIRA Fields] JIRA REST DELETE responded with errors: ' + errors);
                 throw("[Jira API][Rule: Create JIRA Object And Update JIRA Fields] Error deleting object_id [" + object_id + "] " + errors);
             }
             if (resp.errors && !_.isEmpty(resp.errors)){
                 log.error('[Jira API][Rule: Create JIRA Object And Update JIRA Fields] JIRA REST DELETE responded with errors: ' + JSON.stringify(resp.errors));
                 throw("[Jira API][Rule: Create JIRA Object And Update JIRA Fields] Error deleting object_id [" + object_id + "] " + JSON.stringify(resp.errors));
             }  
        }
        return;
    }        
}
        
var rowAction = object_id ? "UPDATE" : "INSERT";

if (actionData.fields && actionData.fields.length > 0 || !object_id){
    
    //transform action data 
    var spec = SysUtility.getResourceAsString(specName),
        input = JSON.stringify(actionData);
    
    var tUtil = Java.type("com.agilecentral.integration.utility.JsonUtility");
    log.debug('[Jira API][Rule: Create JIRA Object And Update JIRA Fields] input payload => ' + input);
    var payload = tUtil.transformString(spec,input);
    log.info('[Jira API][Rule: Create JIRA Object And Update JIRA Fields] transformed payload => ' + payload);
    row.payload = payload;
    payload = JSON.parse(payload);
    
    var url = issue_url;
    if (actionData.object_type.toLowerCase() == "sprint"){
        payload = payload.fields;  //sprint payloads are different
        url = sprint_url;
    }
    
    //Now deal with status 
    if (payload.fields && (payload.fields.status || payload.fields.status === null)){
        var status_str = payload.fields.status; 
        var status_user_attr = _.find(actionData.fields, function(f){
            if (f && f.fieldDef && f.fieldDef.id === "status"){
                return true;
            }
        });
        if (status_user_attr){
             status_user_attr = status_user_attr.fieldDef.user_attribute;
        }
       
        delete payload.fields.status;
    }
    
    //Now deal with null option values - TODO it would be nice to do this in the jolt transform instaead
    _.each(payload.fields, function(v,k){
        if (v && v.value === null){
            payload.fields[k] = null;
        }
        if (v && v.url){
            var val = SysUtility.restGet(v.url,null,gCFG.authHeaders);
            payload.fields[k] = val; 
        }
    });
    log.debug('[Jira API][Rule: Create JIRA Object And Update JIRA Fields] jira payload ' + JSON.stringify(payload));
    //send rest call 
    var resp = null;
    log.debug("[Jira API][Rule: Create JIRA Object And Update JIRA Fields] " + row.action + " url=> " + url);
    if (!object_id){ //Then insert 
        resp = SysUtility.restPost(url,null,headers,payload);  
        row.status_message = resp;
        log.debug('[Jira API][Rule: Create JIRA Object And Update JIRA Fields] JIRA create issue: ' + resp);
        resp = JSON.parse(resp);
        if (resp && resp.id){
            object_id = resp.id;
            objParent.object_id = resp.id;
            objParent.object_key = resp.key || resp.id;
        }
        //Process response, we only get a response if we are doing a post, Put and issuelinks don't return responses.
         if (resp.errorMessages && resp.errorMessages.length > 0){
             log.error("[Jira API][Rule: Create JIRA Object And Update JIRA Fields] error updating jira: " + resp.errorMessages.join(','));
             throw("[Jira API][Rule: Create JIRA Object And Update JIRA Fields] error updating jira: object_id [" + object_id + "] " + resp.errorMessages.join(','));
         }
         if (resp.errors && !_.isEmpty(resp.errors)){
             log.error('[Jira API][Rule: Create JIRA Object And Update JIRA Fields] Error updating JIRA: ' + JSON.stringify(resp.errors));
             throw("[Jira API][Rule: Create JIRA Object And Update JIRA Fields] error updating jira: object_id [" + object_id + "] " + JSON.stringify(resp.errors));
         }
    } 
    
    if (rowAction === "UPDATE"){
        if (actionData.object_type.toLowerCase() === "sprint"){
            var sprintResp = SysUtility.restPost(url + "/" + object_id, null, headers, payload);
            log.debug('[Jira API][Rule: Create JIRA Object And Update JIRA Fields] sprint updated Resp ' + sprintResp);
        } else {
            log.debug('[Jira API][Rule: Create JIRA Object And Update JIRA Fields] before doPut [' + url + object_id + '] ' + JSON.stringify(payload));
            //var result = SysUtility.restPut(url + object_id,null,headers,payload); 
            //result = JSON.parse(result);
            var result = integrationUtility.doPut(url + object_id,null,headers,payload); 
            log.debug("[Jira API][Rule: Create JIRA Object And Update JIRA Fields] doPut result " + JSON.stringify(result));
            if (result && result.errorMessages && result.errorMessages.length > 0){
                log.error('[Jira API][Rule: Create JIRA Object And Update JIRA Fields] Error updating JIRA: ' + result.errorMessages.join(','));
                throw("[Jira API][Rule: Create JIRA Object And Update JIRA Fields] error updating jira: object_id [" + object_id + "] " + result.errorMessages.join(','));
            }
        }
    }

/**
 * Deal with status 
 */
log.debug('[Jira API][Rule: Create JIRA Object And Update JIRA Fields] status update: ' + status_str);
if (status_str){
    var transition = {};
    var requestURL = issue_url + object_id + '/transitions';
    var status_attr_arr = status_user_attr.split('.');
    var result = SysUtility.restGet(requestURL, null, headers);
     try {
        log.debug('[Jira API][Rule: Create JIRA Object And Update JIRA Fields] transitions result' + result);
        var transitions = JSON.parse(result);
        _.each(transitions.transitions, function(t){
               //We do this user_attr_arr here in case the user attribute for the status is something like 
               //statusCateegory.name 
               key = t[status_attr_arr[0]];
               if (status_attr_arr.length > 1){
                    key = t[user_attr_arr[0]][status_attr_arr[1]];
               }
               transition[key] = t.id;
        });
        
    } catch (e) {
        log.warning('[Jira API][Rule: Create JIRA Object And Update JIRA Fields] Problem with transitions: ' + result);
    }
    
    log.debug('[Jira API][Rule: Create JIRA Object And Update JIRA Fields] transitions found for ' + JSON.stringify(transition));
    if (transition && transition[status_str]){
        transition = {"id": transition[status_str]};
       
        log.debug('[Jira API][Rule: Create JIRA Object And Update JIRA Fields] sending to: ' + requestURL);
        var transition_payload = {"transition": transition};
        log.debug('[Jira API][Rule: Create JIRA Object And Update JIRA Fields] transition payload: ' + JSON.stringify(transition_payload));
        //SysUtility.restPost(requestURL, null,headers,transition_payload);
        var resp = integrationUtility.doPost(requestURL, null,headers,transition_payload);
       log.debug('[Jira API][Rule: Create JIRA Object And Update JIRA Fields] transition result: ' + JSON.stringify(resp));
    }
}
    
}

/**
 * If there are issue links, do them here.  TODO is to break this out into an issue link field event instead.
 */
    var issuelink_url = actionData.system.url + "/rest/api/2/issueLink";
    object_id = object_id || row.getParent('jira_object').object_id;
    //TODO: deal with errors for individual issuelinks (see US3114), we don't want the entire transaction to roll if there is an error. 
    //TODO: what if object_id is null? 
    if (object_id === null){
        log.error("[Jira API][Rule: Create JIRA Object And Update JIRA Fields] Cannot update issue link for a null object id.");
        throw ("[Jira API][Rule: Create JIRA Object And Update JIRA Fields] Cannot update issue link for a null object id.");
    }
    
    if (actionData.inwardLinks && actionData.inwardLinks.length > 0){
        var spec = SysUtility.getResourceAsString('transformSpecJiraInwardIssueLinkPayload'),
        input = JSON.stringify(actionData);
    
        var tUtil = Java.type("com.agilecentral.integration.utility.JsonUtility");
        log.debug('[Jira API][Rule: Create JIRA Object And Update JIRA Fields]input for issueLink transform ' + input);
        var payload = tUtil.transformString(spec,input);
        log.debug(issuelink_url + ' => ' + payload);
         log.debug('[Jira API][Rule: Create JIRA Object And Update JIRA Fields] object_id' + object_id);
        payload = JSON.parse(payload);
        _.each(payload, function(link){
            if (link.outwardIssue.id === null){ link.outwardIssue.id = object_id; }
            SysUtility.restPost(issuelink_url,null,headers,link); 
            //There is no response from a link update if successful.  
            //An error will be thrown from the restPost call if something is wrong. 
        });
    
    }
    
    
    if (actionData.outwardLinks && actionData.outwardLinks.length > 0){
          var spec = SysUtility.getResourceAsString('transformSpecJiraOutwardIssueLinkPayload'),
            input = JSON.stringify(actionData);
    
        var tUtil = Java.type("com.agilecentral.integration.utility.JsonUtility");
        log.debug('[Jira API][Rule: Create JIRA Object And Update JIRA Fields] input for issueLink transform ' + input);
        var payload = tUtil.transformString(spec,input);
        log.debug(issuelink_url + ' => ' + payload);
        payload = JSON.parse(payload);
        
        _.each(payload, function(link){
            if (link.inwardIssue.id === null){ link.inwardIssue.id = object_id; }
            SysUtility.restPost(issuelink_url,null,headers,link); 
            //There is no response from a link update if successful.  
            //An error will be thrown from the restPost call if something is wrong. 
        });
    }
    
