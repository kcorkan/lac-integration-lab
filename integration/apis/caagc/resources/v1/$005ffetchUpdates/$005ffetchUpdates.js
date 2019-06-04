log.debug('[Agile Central API][Resource:_fetchUpdates] req.' + req.urlParameters);
var url_params = JSON.parse(req.urlParameters);
if (!url_params.sync_config){
    var msg = "[Agile Central API][Resource:_fetchUpdates] Sync config required!";
    log.error(msg);
    throw (msg);
}

var sysfilter = {sysfilter: "equal(ident:" + parseInt(url_params.sync_config) + ")"};

var system = SysUtility.getResource('syncConfig', sysfilter),
    pagesize = gCFG.maxRallyPageSize,
    order = "LastUpdateDate ASC",
    total_records = 0;

if (!system || system.length === 0){
    var msg = "sync configuration not found: " + url_params.sync_config;
    log.error(msg);
    throw (msg);
}
system = system[0];

if (system.object_type === 'Iteration'){
    order = "EndDate ASC";
} else {
    order = "LastUpdateDate ASC";
}

var params = {
    workspace: system.url + '/workspace/' + system.workspace,
    pagesize: pagesize,
    order: order
};
if (system.project){
    params.project = system.url + '/project/' + system.project;
}
if (system.project_scope_down > 0){
    params.projectScopeDown = true;
}

log.debug('[Agile Central API][Resource:_fetchUpdates] ' + system.object_type + ' last_run: ' + system.last_run);
if (!system.last_run){
   var msg = "[Agile Central API][Resource:_fetchUpdates] please add a date to the agile central sync config table to run from.";
   log.error(msg);
   throw (msg);
}

var last_run = moment(system.last_run).subtract(gCFG.fetchBackSeconds,'second').toISOString();
if (system.object_type != 'Iteration'){
    //TODO: fix last update date for iterations
   params.query = "(LastUpdateDate > \"" + last_run + "\")";
} else {
    params.query = "(EndDate > \"" + last_run + "\")";
}

if (system.query){
    //TODO check for parens around s.query
    params.query = "(" + system.query + " AND " + params.query + ")";
}

var fieldsToFetch = [],
    collectionFields = [],
    latest_last_run = null;

if (system.object_type !== "Iteration"){
    fieldsToFetch.push('LastUpdateDate');
    fieldsToFetch.push('FormattedID');
}

_.each(system.fields, function(f){
    var fd = f.fieldDef;
    fieldsToFetch.push(fd.id);
    if (fd.user_attribute && fd.user_attribute !== fd.id){
        fieldsToFetch.push(fd.user_attribute);
    }
    if (fd.system_attribute && fd.system_attribute !== fd.id && fd.system_attribute !== fd.user_attribute){
        fieldsToFetch.push(fd.system_attribute);
    }
    if (fd.attribute_type === "COLLECTION"){
        collectionFields.push(fd);
    }
});

params.fetch = fieldsToFetch.join(',');
log.debug('[Agile Central API][Resource:_fetchUpdates] fetch' + params.fetch);

var moreRecords = true,
    results = [];

var headers = SysUtility.getFunction('getAuthHeaders',{system: parseInt(system.system_ident), securityToken: false});
headers = JSON.parse(headers);

log.info('[Agile Central API][Resource:_fetchUpdates] parameters ' + JSON.stringify(params));
log.info('[Agile Central API][Resource:_fetchUpdates] AgileCentral url: ' + system.url + '/' + system.object_type);

var pageCounter = 1;
while (moreRecords){
    log.info('Fetching page ' + pageCounter + 'from AgileCentral');
    var resp = SysUtility.restGet(system.url + '/' + system.object_type, params,headers);
    log.debug('[Agile Central API][Resource:_fetchUpdates] AgileCentral response: ' + resp);
    if (!resp){
        throw ("[Agile Central API][Resource:_fetchUpdates] No response recieved from Agile Central.");
    }
    resp = JSON.parse(resp);

    if (!resp.QueryResult){
        throw ("[Agile Central API][Resource:_fetchUpdates] Unexpected response recieved from Agile Central: " + JSON.stringify(resp));
    }
    resp = resp.QueryResult;
    if (resp.Errors && resp.Errors.length > 0){
        throw ("[Agile Central API][Resource:_fetchUpdates] Error querying Agile Central: " + resp.Errors.join(','));
    }
    log.debug(JSON.stringify(resp.Results));

    if (resp.Results && resp.Results.length >0){
        var results = resp.Results;
        //Now, Load the collections, if they were requested.
        if (collectionFields && collectionFields.length > 0){
            _.each(results, function(r){
                _.each(collectionFields, function(cf){
                    var colFieldId = cf.id;
                    if (r[colFieldId] && r[colFieldId].Count > 0){
                        var col = SysUtility.restGet(r[colFieldId]._ref, null,headers);
                        col = JSON.parse(col);
                        r[colFieldId] = col && col.QueryResult && col.QueryResult.Results;
                        log.debug('[Agile Central API][Resource:_fetchUpdates] New collection field value' + JSON.stringify(r[colFieldId]));
                    } else {
                        r[colFieldId] = null;
                    }
                });
            });
        }

        if (!_.isArray(results)){ results = [results]; }
        var payload = {
            "results": results,
            "syncConfigIdent": system.ident
        };
       
        var _fromPayload = SysUtility.restPost(req.fullBaseURL + '_transformArtifactResults',null,gCFG.authHeaders,payload);
        log.info("[Agile Central API][Resource:_fetchUpdates] " + req.fullBaseURL + '_fromAgileCentral =>' + _fromPayload);
        _fromPayload = JSON.parse(_fromPayload);
        total_records = total_records + _fromPayload.length;
        
        //Add for Derby Database lab 
        _.each(_fromPayload, function(p){
            //p.last_updated = moment(p.last_updated).utc().format('YYYY-MM-DD HH:mm:ss');
            log.debug('p' + p.last_updated);
        });
        //END Add for Derby Database 
        
        log.info("[Agile Central API][Resource:_fetchUpdates] Saving page " + pageCounter + " of Agile Central records (Total so far: " + total_records +  ")" );

        SysUtility.restPut(req.fullBaseURL + '_fromAgileCentral',null,gCFG.authHeaders, _fromPayload);
        latest_last_run = _fromPayload && _fromPayload[_fromPayload.length-1].last_updated;
        
    }
    pageCounter = pageCounter + 1;
    params.start = resp.StartIndex + pagesize;
    log.debug("[Agile Central API][Resource:_fetchUpdates] current results count " + results.length + ' of ' + resp.TotalResultCount);
    log.debug("[Agile Central API][Resource:_fetchUpdates] next start index " + params.start);
    moreRecords = (resp.TotalResultCount > resp.StartIndex + pagesize);
} // end while

log.info("[Agile Central API][Resource:_fetchUpdates] totalRecords: " + total_records);
return {
    latestLastRun: latest_last_run,
    totalRecords: total_records
};
