
try {
    var payload = JSON.parse(row.payload),
    eventType = payload && payload.webhookEvent,
    user = payload && payload.user && payload.user.name,
    webhook_id = row.caller;

var system = SysUtility.getResource('system',{sysfilter: "equal(webhook_id:'" + webhook_id + "')"});

var jiraEpicLinkFieldName = system.epic_link_field_name,
    isEpicLink = payload.issueLink && payload.issueLink && payload.issueLink.issueLinkType && payload.issueLink.issueLinkType.name === system.epic_link_name;


if (!system){
    row.status_message = "Ignoring webhook becuase system with webhook_id not found: " + webhook_id;
    row.status_id = 1;
    log.warning(row.status_message);
    return;
}
row.jira_system_ident = system.ident;

if (user && system.username.toLowerCase() === user.toLowerCase()){
    row.status_message = "Ignoring changes because integration user [" + user.toLowerCase() + "] made the update.  Integration User: " + system.username.toLowerCase();
    row.status_id = 1;
    log.warning(row.status_message);
    return;
}

if (!eventType){
    row.status_message = "Ignoring webhook becuase webhook event not found.";
    row.status_id = 1;
    log.warning(row.status_message);
    return;
}

var authHeaders = gCFG.authHeaders;

switch(eventType){
    case "jira:issue_created":
    case "jira:issue_updated":
    case "jira:issue_deleted":

        var object_type = payload && payload.issue && payload.issue.fields && payload.issue.fields.issuetype && payload.issue.fields.issuetype.name;
        if (!object_type){
            row.status_message = "Ignoring webhook becuase object type not found in payload.";
            row.status_id = 1;
            break;
        }

        //This is a workaround to account for the Jira Portfolio Plugin,
        //which can be inconsistent on where it is named a "feature" vs. and "Epic"
        if (object_type.toLowerCase() === "feature"){ object_type = "Epic"; }

        var spec = SysUtility.getFunction('buildSpecIssueWebhookToObject',{system: system.ident, object_type: object_type }),
            input = JSON.stringify(payload);

        log.debug('before webhook transform: ' + spec + input);
        var tUtil = Java.type("com.agilecentral.integration.utility.JsonUtility");
        var data = tUtil.transformString(spec,input);
        data = JSON.parse(data);
        data.object_type = object_type; // We have to do this in case of the feature thing.

        //clean nulls until we update jar to do this
        data.fields = _.reduce(data.fields, function(arr, f){
            if (f && (f._invalid === system.invalid_status || f._invalid === system.blocked_status)){
                f.user_value = f._invalid;
            }
            if (f !== null){
                // turn sprint arrays into strings delimited by the gCFG.arrayDelimiter
                if (_.isArray(f.system_value)){
                    f.system_value = f.system_value.join(gCFG.arrayDelimiter);
                }
                if (_.isArray(f.user_value)){
                    f.user_value = f.user_value.join(gCFG.arrayDelimiter);
                }
                //kc - add nulls to account for field changes to null
                if (f.user_value === undefined && f.system_value === undefined){
                    f.user_value = null;
                    f.system_value = null;
                }
                delete f._invalid;
                arr.push(f);
            }
            return arr;
        },[]);

        if (eventType === "jira:issue_deleted"){
            data.deleted = moment(payload.timestamp).toISOString();
        } else {
            data.deleted = null;
        }
        data = [data];
        log.debug('_fromJira payload: ' + JSON.stringify(data));
        var putRes = SysUtility.restPut(req.fullBaseURL + '_fromJira',null,authHeaders,data);
        log.debug('putRes: ' + putRes);
        putRes = JSON.parse(putRes);
        if (putRes.statusCode < 300 && putRes.txsummary && putRes.txsummary.length > 0){
            row.jira_object_ident = putRes.txsummary[0].jira_object_ident || putRes.txsummary[0].ident;
        } else {
            row.status_id=3;
            row.status_message=JSON.stringify(putRes);
            return; 
        }
        row.status_id = 2;
        break;
    case "issuelink_created":
    case "issuelink_deleted":
          payload.system_ident = system.ident;
        if (payload && payload.issueLink && payload.issueLink.systemLink){
            /**
                This is a systemLink, which denotes a "special" relationship (e.g. Sub-task, Epic)
                and must be handled deifferently than a traditional linked object.
                Word of caution: 'Epic-Story Link' *might* be customizable.
                So far I haven't been able to find any evidence that it is or isn't, but we should keep this in mind.
                If it is customizable, we'll need to add a system-level configuration (like Blocked/Invalid field) from which we
                can retrieve the Epic-Story Link name.
                We will restrict this to Epic/Story link until we support other "special" links (e.g. sub-task)
                We are using the name to key on this becuase we don't know the id (we could put into a configuration) and we can't trust
                that is the same across all instances.

                {
                    "timestamp": 1538429007361,
                    "webhookEvent": "issuelink_created",
                    "issueLink": {
                        "id": 31244,
                        "sourceIssueId": 31608,
                        "destinationIssueId": 31533,
                        "issueLinkType": {
                            "id": 10201,
                            "name": "Epic-Story Link",
                            "outwardName": "is Epic of",
                            "inwardName": "has Epic",
                            "style": "jira_gh_epic_story",
                            "subTask": false,
                            "system": true
                        },
                        "systemLink": true
                    }
                }

            **/
            if (payload.issueLink.issueLinkType.name === system.epic_link_name){

                if (eventType === 'issuelink_deleted'){
               /* we need to disable issuelink_deleted event for epic links, becuase it is firing with the issuelink_created, but may be processed after
               the issuelink created, and so we are removing the link.
               At this point, we shouldn't be orphaning stories in AC, so this should be little or no impact since changing the
               Epic Link will in turn delete the last epic link.
               If it becomes a requirement to allow orphaned stories to sync to AC, then we will need to revisit this.
               We may need to implement a check to make sure if issuelink deleted does
               come in, that we are deleting the same link that exists now, instead of a new link */

                    row.status_message = "Ignoring webhook because it is an issuelink_deleted event for epic link";
                    row.status_id =1;
                    log.warning(row.status_message);
                    return;
                }

                var artifacts = SysUtility.getResource('jiraObject', {sysfilter: ["equal_or(object_id:" + payload.issueLink.sourceIssueId + ",object_id:" + payload.issueLink.destinationIssueId + ")", "equal(system_ident:" + system.ident + ")"]});
                var epicData = null,
                    storyData = null;

                _.each(artifacts, function(a){
                    if (a.object_id === payload.issueLink.sourceIssueId){
                        epicData = a;
                    }
                    if (a.object_id === payload.issueLink.destinationIssueId){
                        storyData = a;
                    }
                });
                log.debug('artifacts ' + JSON.stringify(artifacts));
                if (storyData === null){
                    row.status_message = "Ignoring changes because Story not found [" + payload.issueLink.destinationIssueId + "]";
                    row.status_id = 1;
                    log.warning(row.status_message);
                    return;
                }

                var epicKey = null;
                epicKey = epicData && epicData.object_key || null;
                if (!epicKey){
                    log.warning("Epic not found [" + payload.issueLink.sourceIssueId + "]. Removing Story-Epic link.");
                } else {
                    log.debug('epicData ' + epicData && JSON.stringify(epicData));
                }


                var syncConfig = SysUtility.getResource('syncConfig',{sysfilter:["equal(system_ident:" + system.ident + ")","equal(object_type:'Story')"]});
                
                log.debug('syncConfig ' + JSON.stringify(syncConfig));
                log.debug('storyData ' + JSON.stringify(storyData));
                var last_updated = moment(payload.timestamp).toISOString();
                var newStoryData = {
                    '@metadata': {"action":"MERGE_INSERT"},
                    "last_updated": last_updated,
                    "object_id": storyData.object_id,
                    "object_key": storyData.object_key,
                    "object_type": storyData.object_type,
                    "system_ident": storyData.system_ident,
                    "fields": []
                };
                 
                var linkField = null; 
                if (syncConfig && syncConfig.length > 0){
                    linkField = _.find(syncConfig[0].fields, function(f){
                        log.debug('f' + f.fieldDef.name);
                        return f && f.fieldDef && f.fieldDef.name === jiraEpicLinkFieldName;
                    });
                } else {
                    log.warning ("No Story syncConfig found for " + system.ident);
                }
    
                 if (linkField){
                     newStoryData.fields.push({
                         "system_value": epicKey,
                         "user_value": epicKey,
                         "field_ident": linkField.fieldDef.ident,
                         "last_updated": last_updated,
                         "@metadata": {"action":"MERGE_INSERT"}
                     });
                 }

                log.debug('_fromJira payload: ' + JSON.stringify(newStoryData));
                var putRes = SysUtility.restPut(req.fullBaseURL + '_fromJira',null,authHeaders,[newStoryData]);
                log.debug('putRes: ' + putRes);
                //TODO: assign object ident from response.
                log.info("Issuelink for [" + storyData.object_key + "] and [" + epicKey + "]");
                row.status_id = 2;
                break;


            } else {
                row.status_message = "Ignoring changes because systemLink not supported [" + payload.issueLink.issueLinkType.name + "]";
                row.status_id = 1;
                log.warning(row.status_message);
                return;
            }

        } else {
            //This is not a system Link, and is a normal linked item relationship.
            row.status_id = 2; 
            row.status_message = "Issuelink type not supported:  " + payload && payload.issueLink && payload.issueLink.issueLinkType && payload.issueLink.issueLinkType.name;
            log.warning(row.status_message);
            return;
            // var spec = SysUtility.getResourceAsString('transformSpecIssueLinkWebhookToObject'),
            // input = JSON.stringify(payload);

            // var tUtil = Java.type("com.agilecentral.integration.utility.JsonUtility");
            // var data = tUtil.transformString(spec,input);
            // data = JSON.parse(data);

            // if (eventType === "issuelink_deleted"){
            //     data.deleted = moment().toISOString();
            // } else {
            //     data.deleted = null;
            // }
            // data["@metadata"] = {"action":"MERGE_INSERT"};

            // var putRes = SysUtility.restPut(req.fullBaseURL + '_fromJiraLink',null,authHeaders,data);
            // log.debug('putRes: ' + putRes);
            //TODO: assign object ident from response.
        }
        row.status_id = 2;
        break;

    default:
        row.status_message = "Ignoring webhook becuase webhook event not recognized: " + eventType;
        row.status_id =1;
        log.warning("Unrecognized format for webhook ident [" + row.ident + "]" + row.status_message);
    }

} catch (e){
    row.status_id = 3;
    row.status_message = "Error -- " + e;
    log.error('Event: Process Webhook for ident [' + row.ident + '] ' + row.status_message);
}
