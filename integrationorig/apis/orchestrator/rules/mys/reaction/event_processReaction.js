
if (oldRow.status === 0 && row.status === 1){
    var clearSourceFields = false;
    try {
        //get the target_data - we do this here so that we get the latest updates for transforms.
        row.node_ip = SysUtility.getHostAddress();
        var catalyst = row.getParent('catalyst'),
            source_data = catalyst.source_data,
            source_action = catalyst.source_action;

        if (!row.target_object_id && source_action !== "DELETE"){
            //Let's check and see if the item has since been created.  If not, then this is an INSERT
            //We checked this in the catalyst, but there is the scenario where something might be in the queue
            //and not created yet, so we need to verify again that it hasn't been created since the catalyst was queued.
            var xref = SysUtility.getResource('xref',{sysfilter: ["equal(xref_id:'" + row.xref_id + "')",
                                    "equal(system_ident:'" + row.target_system_ident + "')",
                                    "equal(object_type:'" + row.target_object_type + "')"]});
            if (xref && xref.length > 0){
                row.target_object_id = xref[0].object_id;
                source_action = "UPDATE";
                if (xref.length > 1){
                    log.warning('[Orchestrator API][Event:Process Reaction] Multiple xrefs found for target: ' + JSON.stringify(xref));
                }
            } else {
                source_action = "INSERT";
            }
        }

        if (source_action === "INSERT"){ clearSourceFields = true; }

        log.info('[Orchestrator API][Process Reaction] source_data' + source_data + ' source_action ' + source_action);
        var target_data = SysUtility.getFunction( 'transform',{"configIdent":row.cfg_obj_ident, "sourceData": source_data, 'sourceAction': source_action});
        log.info('[Orchestrator API][Process Reaction] target_data' + target_data);

        if (target_data.deleted){ // This is to handle transforms where we delete as a result of an update/insert/
            source_action = "DELETE";
            delete target_data.deleted;
        }
        row.target_data = target_data;

        var last_updated = moment(catalyst.last_updated).toISOString();

        var deleted = null;
        if (source_action === "DELETE"){
            deleted = last_updated;
        }

        if (source_action !== "DELETE" && (!target_data || _.isEmpty(JSON.parse(target_data)))){
            row.status = 2;
            return;
        }

        var payload = {
            system_ident: row.target_system_ident,
            xref_id: row.xref_id,
            object_type: row.target_object_type,
            last_updated: last_updated,
            target_data: row.target_data,
            deleted: deleted
        };

/*
 * Check if reconciliation is needed.
 */
    var filter = [
        "equal(source_api_def_ident:" + catalyst.source_api_def_ident + ")",
        "equal(source_system_ident:" + catalyst.source_system_ident + ")",
        "equal(source_object_type:'" + catalyst.source_object_type + "')",
        "equal(source_object_id:'" + catalyst.source_object_id + "')",
        "equal(target_api_def_ident:" + row.target_api_def_ident + ")",
        "equal(target_system_ident:" + row.target_system_ident + ")",
        "equal(target_object_type:'" + row.target_object_type + "')",
        "equal_or(xref_id:null, xref_id: '')"
    ];
    log.debug('filter ' + filter.join(','));
    var reconciliations = SysUtility.getResource("toBeReconciled", {sysfilter: filter});
    log.debug('recon' + JSON.stringify(reconciliations));

    var reconciliation_ident = null;
    if (reconciliations && reconciliations.length > 0){
        payload.reconcile_id = reconciliations[0].target_object_id;
        payload.object_key = reconciliations[0].target_object_key;
        reconciliation_ident = reconciliations[0].ident;
    }
/** END Reconciliation **/

    var api = SysUtility.getFunction('getApiConfig',{apiIdent: row.target_api_def_ident });
    api = JSON.parse(api);

    log.debug('Put to API: ' + api.baseUrl + 'reaction' + " => " + JSON.stringify(payload));
    var resp = SysUtility.restPost(api.baseUrl + 'reaction',null,api.authHeaders,payload);
    log.debug('resp' + resp);
    var resp = JSON.parse(resp);

        if (resp.object_id && !row.target_object_id){
            row.target_object_id = resp.object_id;

            var xrefs = SysUtility.getResource('xref',{sysfilter: [
                "equal(xref_id:'" + row.xref_id + "')",
                "equal(object_id:'" + row.target_object_id + "')",
                "equal(api_def_ident:" + row.target_api_def_ident + ")",
                "equal(system_ident:" + row.target_system_ident + ")",
                "equal(object_type:'" + row.target_object_type + "')"
            ]});

            if (!xrefs || xrefs.length === 0){

                var newXref = logicContext.createPersistentBean("xref");
                newXref.xref_id = row.xref_id;
                newXref.api_def_ident = row.target_api_def_ident;
                newXref.system_ident= row.target_system_ident;
                newXref.object_type= row.target_object_type;
                newXref.object_id= row.target_object_id;
                logicContext.insert(newXref);
            }


            //  var params = {
            //     object_type: row.target_object_type,
            //     object_id: row.target_object_id,
            //     xref_id: row.xref_id,
            //     api_def_ident: row.target_api_def_ident,
            //     system_ident: row.target_system_ident,
            //     "@metadata": {"action": "MERGE_INSERT"}
            // };
            // var config = SysUtility.getResource('config');
            // var resp = SysUtility.restPut(req.fullBaseURL + 'xref_catalyst',null,gCFG.authHeaders,params);
            // log.debug('xref response' + resp);

        }

        row.status = 2;
        if (reconciliation_ident){
            var bean = logicContext.getBeanByPrimaryKey('reconciliation', reconciliation_ident);
            if (bean){
                logicContext.touch(bean);
                bean.xref_id = row.xref_id;
                logicContext.update(bean);
            }
        }
        if (row.target_object_id) { clearSourceFields = false; }

    } catch (e){
        row.status = 3;
        var errMsg = logicContext.createPersistentBean('status_message');
        errMsg.message_text =e;
        errMsg.reaction_ident = row.ident;
        logicContext.insert(errMsg);
        log.error("Error processing reaction for xref=" + row.xref_id + " reaction_ident=" + row.ident + ": " + e);
    }

    if (clearSourceFields){
        try {
             //Let's clear the fields in the source since the insert failed
            log.info("[Orchestrator  API][Event:Process Reaction] START CLEAR SOURCE FIELDS for reaction " + row.ident);
            var api = SysUtility.getFunction('getApiConfig',{apiIdent: row.getParent('catalyst').source_api_def_ident });
            api = JSON.parse(api);

            var res = SysUtility.restGet(api.baseUrl + 'apiObject',{sysfilter: "equal(xref_id:'" + row.xref_id + "')"},api.authHeaders);
            log.info('[Orchestrator  API][Event:Process Reaction] response from GET apiObject ' + res);
            var source_object = JSON.parse(res);
            if (source_object && source_object.length > 0){
                _.each(source_object, function(s){
                    _.each(source_object[0].fields, function(f){
                        f["@metadata"].action = "DELETE";
                    });
                    log.info("[Orchestrator  API][Event:Process Reaction] PUT payload: " + JSON.stringify(source_object));
                    res = SysUtility.restPut(api.baseUrl + "apiObject",null,api.authHeaders,source_object);
                    log.info("[Orchestrator  API][Event:Process Reaction] response from PUT apiObject (DELETE fields): " + res);
                    res = JSON.parse(res);
                    if (res){

                    }
                });
            }

        } catch (ex){
            log.error("[Orchestrator  API][Event:Process Reaction] CLEAR SOURCE FIELSD Unable to delete fields for apiObject: " + ex);
        }


    }
}
