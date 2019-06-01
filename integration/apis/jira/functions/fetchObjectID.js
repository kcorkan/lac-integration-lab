     var url = [row.url,'rest/api/2/issue',parameters.object_key].join('/');
    var params = {};
    var authHeaders = SysUtility.getFunction('getAuthHeaders',{system: row.ident});
    authHeaders = JSON.parse(authHeaders);
    try {
        log.debug('[Jira API][fn: fetchObjectID] Params:' + params + ' Url: ' + url );
        var issue = SysUtility.restGet(url,params,authHeaders);
        log.debug('issue ' + issue);
        
        if (issue){
            issue = JSON.parse(issue);
            return issue.id;
        }    
    } catch(e){
        throw ("No issue found in Jira system for [" + parameters.object_key + "]");
    }
     

