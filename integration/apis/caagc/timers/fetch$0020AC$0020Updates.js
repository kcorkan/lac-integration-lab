try{ 
    var syncUrl = "http://localhost:8080/rest/default/caagc/v1/fetchAllUpdates",
        headers = {"headers":{"Authorization": "CALiveAPICreator J8KDHTu7hRHIC7Gl1p1P:1"}};
    var resp = timerUtil.restGet(syncUrl,null,headers);
    log.debug(resp);
} catch(e){
    log.error('Fetch AC Updates Timer Error ' + e);
}
