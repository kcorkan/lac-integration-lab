var response = [];
var thisNode = SysUtility.getHostAddress(); 
var reactions = null; 

try {
    
     var pageSize = gCFG.reactionBatchSize; 

     log.info("[Orchestrator API][runReactionBatch] batchSize " + pageSize + ' batchGrouping ' + gCFG.batchGrouping);
     reactions = SysUtility.getResource('reaction',{
            sysfilter: "equal(status:0)",
            sysorder: '(ident:asc)',
            pagesize: pageSize 
    });
} catch (ex){
    log.error('[Orchestrator API][runReactionBatch] Error getting reactions ' + ex);
}

if (!reactions || reactions.length === 0){
    log.debug('[Orchestrator API][runReactionBatch] No reactions to run.' + JSON.stringify(reactions));
    return {
        "reactions": 0
    };
}

var start_t = moment().valueOf();
var unchanged = []; 

//Validate that we are only dealing with reaction records, and no metadata records
//Also, "reserve" the reaction records -- this should take very little time (less time than it takes for another node to start running and reserve the reactions)
var updateReactions = _.reduce(reactions, function(ar, rx){
    if (rx.node_ip && rx.node_ip !== thisNode){
        //Don't run any reactions, we need to wait until the others are finished. 
        ar = null;
        return null; 
    }
    if (rx.node_ip === thisNode){
        unchanged.push(rx);
    }
    if (ar && rx.ident > 0 && rx.node_ip === null){
        rx.node_ip = thisNode; 
        ar.push(rx);
    }
    return ar; 
},[]);

//Wait until the current queue is finished up.
if ((!updateReactions || updateReactions.length === 0) && unchanged.length === 0 ){
    log.warning('[Orchestrator API][runReactionBatch] No available reactions to reserve.');
    return {
        "reactions": 0
    }; 
}

var reserveRes = null; 
try {

    var reserveRes = SysUtility.restPut(req.fullBaseURL + 'reaction',null,gCFG.authHeaders, updateReactions);
    log.debug('[Orchestrator API][runReactionBatch] reserveRes ' + reserveRes);
    reserveRes = JSON.parse(reserveRes);
    var timeToReserve = moment().valueOf() - start_t;
    log.info('[Orchestrator API][runReactionBatch] time to reserve (ms) ' + timeToReserve);
    if (reserveRes && reserveRes.statusCode > 300){
        var errorMsg = '[Orchestrator API][runReactionBatch] ERROR reserving reactions: ' + reserveRes.errorMessage || JSON.stringify(reserveRes);
        log.error(errorMsg);
        return {
            "reactions": 0,
            "errorMessage": errorMsg
        };    
    }
} catch (ex){
    log.error('[Orchestrator API][runReactionBatch] Error reserving reactions ' + ex);
}

var reservedReactions = reserveRes && reserveRes.txsummary || [];
_.each(unchanged, function(u){
    reservedReactions.push(u);
});

if (reservedReactions.length === 0){
    log.warning("[Orchestrator API][runReactionBatch] No reactions reserved.");
    return {
        "reactions": 0,
        "warningMessage": "[Orchestrator API][runReactionBatch] No reactions reserved."
    }; 
}

//Now organize to run in parallel batches 
var parallelBatches = {};
var maxBatchCount = 0; 
_.each(reservedReactions, function(rx){
    var batchKey = 'b' + rx[gCFG.batchGrouping];
    if (!parallelBatches[batchKey]){
        parallelBatches[batchKey] = [];
    }
    parallelBatches[batchKey].push(rx);
    maxBatchCount++; 
});

log.info("[Orchestrator API][runReactionBatch] parallelBatches " + JSON.stringify(parallelBatches));

var executor = java.util.concurrent.Executors.newCachedThreadPool();
var futuresMap = new java.util.concurrent.ConcurrentHashMap();
try {
     
     for (var j=0; j<maxBatchCount; j++){
    
        _.each(parallelBatches, function(batch, batchKey){
            if (batch.length > j){
                var b = batch[j];
                b.status=1; 
                futuresMap.put(batchKey, executor["submit(java.util.concurrent.Callable)"](function(){
                    return SysUtility.restPut(req.fullBaseURL + 'reaction',null,gCFG.authHeaders, b);
                }));
                batch.shift();  //remove the first
            }
        });
  
        // Consolidate the results from each thread.
        for (var i = 0; i < gCFG.batchWaitLoopCount; i++) {
            var keySet = futuresMap.keySet();
            for each (var key in keySet) {
                var future = futuresMap.get(key);
                if (future.isDone()) {
                    var result = future.get();
                    response.push(JSON.parse(result));
                    futuresMap.remove(key);
                }
            }
            if (futuresMap.isEmpty()) {
                break;
            }
            // Avoid a busy loop -- yield CPU time
            java.lang.Thread.sleep(gCFG.batchWaitLoopYieldMs);
            if (i >= gCFG.batchWaitLoopCount) {
                log.error("The results did not complete in expected time ");
                break; 
            }
        } //end for i= 0..batchWaitLoopCount
     } //end for i= 0..maxBatchCount 

} catch (e){
    log.error('[Orchestrator API][Resource: runReactionBatch] ERROR ' + e + ' response so far ' + JSON.stringify(response) + '; reactions ' + JSON.stringify(reactions));
}

var elapsed_t = moment().valueOf() - start_t;
log.info('[Orchestrator API][Resource: runReactionBatch] executed in ' + elapsed_t + ' seconds.');
log.debug('[Orchestrator API][Resource: runReactionBatch] response ' + JSON.stringify(response));
executor.shutdownNow();
return response;
