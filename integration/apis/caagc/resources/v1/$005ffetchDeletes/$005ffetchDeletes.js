var url_params = JSON.parse(req.urlParameters);
if (!url_params.sync_config){
    var msg = "[Agile Central API][Resource:_fetchDeletes] Sync config required!";
    log.error(msg);
    throw (msg);
}

var sysfilter = {sysfilter: "equal(ident:" + parseInt(url_params.sync_config) + ")"};

var system = SysUtility.getResource('syncConfig', sysfilter),
    pagesize = gCFG.maxRallyPageSize,
    order = "DeletionDate ASC",
    total_records = 0;

if (!system || system.length === 0){
    var msg = "[Agile Central API][Resource:_fetchDeletes] sync configuration not found: " + url_params.sync_config;
    log.error(msg);
    throw (msg);
}
system = system[0];

var headers = SysUtility.getFunction('getAuthHeaders',{system: parseInt(system.system_ident), securityToken: false});
headers = JSON.parse(headers);

var pageCounter = 1,
    moreRecords = true,
    last_run = moment(system.last_run).toISOString(),
    params = {
        workspace: system.url + '/workspace/' + system.workspace,
        pagesize: pagesize,
        fetch: "true",
        order: order,
        query: "((DeletionDate > \"" + last_run + "\") AND (Type.TypePath contains \"" + system.object_type + "\"))"
    };

log.debug('[Agile Central API][Resource:_fetchDeletes] params ' + JSON.stringify(params));
while (moreRecords){
    var resp = SysUtility.restGet(system.url + '/RecycleBinEntry', params,headers);
    log.debug('[Agile Central API][Resource:_fetchDeletes] Agile Central response: ' + resp);
    if (!resp){
        var msg = '[Agile Central API][Resource:_fetchDeletes] No response received from Agile Central. params=' + JSON.stringify(params);
        log.error(msg);
        throw (msg);
    }
    resp = JSON.parse(resp);

    if (!resp.QueryResult){
        var msg = '[Agile Central API][Resource:_fetchDeletes] No response received from Agile Central.  params=' + JSON.stringify(params);
        log.error(msg);
        throw (msg);
    }
    resp = resp.QueryResult;
    if (resp.Errors && resp.Errors.length > 0){
        var msg = "[Agile Central API][Resource:_fetchDeletes] Error querying Agile Central: " + resp.Errors.join(',');
        log.error(msg);
        throw (msg);
    }

    if (resp.Results && resp.Results.length >0){
       
        var filters = ['equal(system_ident:' + system.ident + ')'],
            equal_or = [],
            id_deleted = {};
            
        _.each(resp.Results, function(r){
            equal_or.push(r.ID);
            id_deleted[r.ID] = r.DeletionDate; 
        });
        
        filters.push("equal_or(object_key:'" + equal_or.join("', object_key:'") + "')");
        log.debug('[Agile Central API][Resource:_fetchDeletes] filters ' + filters);
        var deleted_items = SysUtility.getResource('_fromAgileCentralDeleted', {sysfilter: filters});
        var payload = _.map(deleted_items, function(d){
            d.deleted = id_deleted[d.object_key];
            d.last_updated = id_deleted[d.object_key];
            return d;
        });
       log.debug('[Agile Central API][Resource:_fetchDeletes] payload ' + JSON.stringify(payload));
       
        total_records = total_records + payload.length;
        
        SysUtility.restPut(req.fullBaseURL + '_fromAgileCentralDeleted',null,gCFG.authHeaders, payload);
    }
    pageCounter = pageCounter + 1;
    params.start = resp.StartIndex + pagesize;
    moreRecords = (resp.TotalResultCount > resp.StartIndex + pagesize);
} // end while
log.info("[Agile Central API][Resource:_fetchDeletes] totalRecords: " + total_records);
return {
    totalRecords: total_records 
};
