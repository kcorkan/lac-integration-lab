try {
      var reactions = timerUtil.restGet(gCFG.runReactionUrl,null,gCFG.authHeaders);
    log.info("Run Reactions Timer[" + moment().toISOString() + "]: runReactionBatch=" + reactions);
  } catch(e){
    log.error('Run Reactions Timer Error ' + e);
}
