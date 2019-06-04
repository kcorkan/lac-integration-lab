log.debug('req.' + req.urlParameters);
var url_params = JSON.parse(req.urlParameters);
if (!url_params.sync_config){
    throw ("Sync config required!");
}

var sysfilter = {sysfilter: "equal(ident:" + parseInt(url_params.sync_config) + ")"};

var system = SysUtility.getResource('syncConfig', sysfilter),
    max_results = 100,
    timezone_offset = 6,
    total_records = 0;
    
if (!system || system.length === 0){
    throw ("sync configuration not found: " + url_params.sync_config);
}
system = system[0];

var searchUrl = system.url + '/rest/api/2/search';

if (!system.last_run){
    throw ("Plesae set a time in the jira sync config ident [" + system.ident + ": " + system.name + "] to fetch from.");
}
var start_t = moment().valueOf();

var jira_date = moment(system.last_run).subtract(timezone_offset,"hours").format("YYYY/MM/DD HH:mm");
    
var query = "updated > \"" + jira_date + "\""; 
    if (system.object_type != "sprint" && system.object_type != "project"){
        query = query + "AND issueType = \"" + system.object_type + "\"";
    } 
    if (system.query){
        query = query + " AND " + system.query;
    }
    query = query + "+order+by+updated+asc";

    var params = {
        expand: "names",
        jql: query  
    };

    var fieldsToFetch = _.map(system.fields, function(f){
        return f && f.fieldDef && f.fieldDef.id;
    });
    fieldsToFetch.push("updated");
    params.fields = fieldsToFetch.join(',');
    
    var headers = SysUtility.getFunction('getAuthHeaders',{system:system.system_ident});
        headers = JSON.parse(headers);
    var startAt = 0,
        moreRecords = true,
        results = []; 
    
    log.debug('parameters ' + JSON.stringify(params));
    log.debug('headers ' + JSON.stringify(headers));
    
    while (moreRecords){
        var request_url = searchUrl + "?startAt=" + startAt + "&maxResults=" + max_results;
        log.debug('url ' + request_url);
        var resp = SysUtility.restGet(request_url, params,headers);
        log.debug('resp' + resp);
        if (!resp){ 
            var msg = "No response recieved from JIRA system " + system.name + "[" + system.system_name + "]";
            throw(msg);
        } 
        resp = JSON.parse(resp);
        
        if (resp.error){ 
           throw("_fetchUpdates: Error recieved from jira " + system.url + " for Jira system " + system.name + ": " + resp.error);
        }
        if (resp.errorMessages){ 
           throw("_fetchUpdates: Error recieved from jira " + system.url + " for Jira system " + system.name + ": " + resp.errorMessages.join(', '));
        }
       
        log.debug(JSON.stringify(resp));
        if (resp.issues && resp.issues.length > 0){
            
            var payload = {
                "issues": resp.issues,
                "syncConfigIdent": system.ident
            };
            var _fromJiraPayload = SysUtility.restPost(req.fullBaseURL + '_transformIssues',null,gCFG.authHeaders,payload);
            log.debug(req.fullBaseURL + '_fromJira =>' + _fromJiraPayload);
            _fromJiraPayload = JSON.parse(_fromJiraPayload);
            total_records = total_records + _fromJiraPayload.length;
            SysUtility.restPut(req.fullBaseURL + '_fromJira',null,gCFG.authHeaders, _fromJiraPayload);

        } 
        
        startAt = resp.startAt + max_results;
        moreRecords = (resp && resp.total > startAt); 
    }
    
var res = SysUtility.restGet(system["@metadata"].href + '/updateLastRun',null,gCFG.authHeaders);

var end_t = moment().valueOf(),
    elapsed_t = (end_t - start_t)/1000;
    
res = JSON.parse(res);
res.totalRecords = total_records;
log.info("_fetchUpdates: " + total_records + " records processed in " + elapsed_t + " seconds.")
return res;
