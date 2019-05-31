//TODO: find a better way to search for boards than bringing all back.  We can search by 
//name, but that is case sensitive...
log.debug('Set BoardID on Sprint ' + row.jira_field_def.schema_type);
if (row.jira_field_def.schema_type == "board" && req.resourceName == "_toJira"){
    if (row.user_value === null){
        row.system_value = null;
        return; 
    }
    
    var system = SysUtility.getResource('system',{sysfilter: "equal(ident:" + row.jira_field_def.system_ident + ")"});

    var rowVal = row.user_value,
        board_url = system.url + "/rest/agile/1.0/board";
    
    var authHeaders = SysUtility.getFunction('getAuthHeaders',{system: system.ident });
    authHeaders = JSON.parse(authHeaders);
    
    var moreRecords = true,
        board = null,
        boardName = row.user_value.toLowerCase(),
        startAt = 0,
        maxResults = 50;
        
    while (moreRecords){
        
        var request_url = board_url + "?startAt=" + startAt + "&maxResults=" + maxResults;
        log.debug('rowVal' + rowVal + request_url);
        var boards = SysUtility.restGet(request_url, null, authHeaders);
        
        log.debug('boards ' + boards);
        boards = JSON.parse(boards);
        
        board = _.find(boards.values, function(b){
            log.debug(JSON.stringify(b));
             return b.name.toLowerCase() === boardName;
        });
        if (board){
            moreRecords = false; 
        } else {
            startAt = boards.startAt + maxResults;
            moreRecords = (boards && boards.total > startAt) || boards.isLast === false; 
        }
        log.debug('startAt' + startAt + maxResults + boards.total + moreRecords + boards.isLast);
    }
    log.debug('board: ' + JSON.stringify(board));
        
    if (board){
        row.system_value = board.id;          
    } else {
        log.warning('No board found for ' + row.user_value);
        row.system_value = null;
    }
}
