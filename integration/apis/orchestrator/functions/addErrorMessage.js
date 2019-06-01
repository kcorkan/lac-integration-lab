log.debug('msg ' + parameters.msg);

var errorUrl = req.fullBaseURL + "errorMessage";
var re = new RegExp(/{.*\"errorMessage\": (.*)}/);
var trimmedMsg = re.exec(parameters.msg);
if (trimmedMsg && trimmedMsg.length > 1){
    trimmedMsg = trimmedMsg[1];
} else {
    trimmedMsg = parameters.msg;
}

var cfgObjIdent = null; 
if (parameters.cfg_obj_ident){
    cfgObjIdent = parseInt(parameters.cfg_obj_ident);
}

var reactionIdent = null; 
if (parameters.reaction_ident){
    reactionIdent = parseInt(parameters.reaction_ident);
}

var resp = SysUtility.restPost(errorUrl, null, gCFG.authHeaders,{
    message_text: trimmedMsg,
    cfg_obj_ident: cfgObjIdent,
    reaction_ident: reactionIdent 
});

log.debug('addErrorMessage.response ' + resp);

resp = JSON.parse(resp);
if (resp.statusCode < 300 && resp.txsummary.length > 0){
    return {"ident": resp.txsummary[0].ident};
}
log.error('Error adding error message from orchestrator.addErrorMessage function');
return {
    "ident": null,
    "errorMessage": "Error adding error message"
};
