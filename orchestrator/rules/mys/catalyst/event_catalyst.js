var source_action = row.source_action;

var xrefs = SysUtility.getResource('xref',{sysfilter: "equal(xref_id:'" + row.xref_id + "')"});
//TODO - if we allow changing object types, then we'll need to do an update here if the source is found
if (xrefs.length === 0){

    var newXref = logicContext.createPersistentBean("xref");
    newXref.xref_id = row.xref_id;
    newXref.api_def_ident = row.source_api_def_ident;
    newXref.system_ident= row.source_system_ident;
    newXref.object_type= row.source_object_type;
    newXref.object_id= row.source_object_id;
    logicContext.insert(newXref);

}


var filter = [
    "equal(source_api_def_ident:" + row.source_api_def_ident + ")",
    "equal(source_system_ident:" + row.source_system_ident + ")",
    "equal(source_obj_type:'" + row.source_object_type +"')"
];
log.debug('reactionConfig filter: ' + filter);
var reactionConfigs = SysUtility.getResource('reactionConfig',{sysfilter: filter});

log.debug('Event New Catalyst: ' + reactionConfigs.length + " reaction configurations found." + JSON.stringify(reactionConfigs));

 _.each(reactionConfigs, function(r){

    var target_xref = _.find(xrefs, function(x){
         return x.api_def_ident == r.target_api_def_ident &&
                x.system_ident == r.target_system_ident &&
                x.object_type == r.target_object_type;

    });

    var newReaction = logicContext.createPersistentBean("reaction");
    newReaction.xref_id = row.xref_id;
    newReaction.target_api_def_ident = r.target_api_def_ident;
    newReaction.target_system_ident= r.target_system_ident;
    newReaction.target_object_type= r.target_obj_type;
    newReaction.target_object_id = target_xref && target_xref.object_id || null;
    newReaction.catalyst_ident= row.ident;
    newReaction.cfg_obj_ident= r.ident;
    newReaction.status = 0;
    logicContext.insert(newReaction);
});

log.debug('exiting New Catalyst Event');
