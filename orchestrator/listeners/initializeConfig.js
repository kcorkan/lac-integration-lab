// Listener code goes here or check out examples ( see top right dropdown menu )
//var settings = listenerUtil.restGet(url, params, settings);

gCFG.setAuthToken("J8KDHTu7hRHIC7Gl1p1P");
gCFG.initialize("xrefCatalystUrl", 'http://usa-dev.us-east-2.elasticbeanstalk.com/rest/default/orchestrator/v1/xref_catalyst');
gCFG.initialize("runReactionUrl", 'http://usa-dev.us-east-2.elasticbeanstalk.com/rest/default/orchestrator/v1/runReactionBatch');
gCFG.initialize("reactionBatchSize",10);
gCFG.initialize("batchGrouping","cfg_obj_ident"); //or cfg_obj_ident or target_system or target_object_type, etc
gCFG.initialize("batchWaitLoopCount",100);
gCFG.initialize("batchWaitLoopYieldMs",100);
gCFG.initialize("reactionHighInjestBatchSize",5);
gCFG.initialize("reactionLowInjestBatchSize",10);
gCFG.initialize("reactionInjestLowThreshhold",5);
gCFG.initialize("reactionInjestHighThreshhold",10);

