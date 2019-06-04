log.debug('req.verb' + req.urlParameters); 
if (req.verb !== "POST"){
    var msg = req.verb + " not a valid verb for this request.";
    log.error(msg);
    throw (msg);
}

var sourceData = JSON.parse(req.json),
    reactionConfigIdent = req.urlParameters.reactionConfigIdent; 
    
if (!sourceData || !reactionConfigIdent){ throw ("Source data and reactionConfig ident must be provided for a transform."); }    

var reactionConfig = SysUtility.getResource('reactionConfig',{sysfilter: "equal(ident:" + reactionConfigIdent + ")"});
    
if (!reactionConfig || reactionConfig.length === 0 || !reactionConfig[0].fields || reactionConfig[0].fields.length ===0 ){ 
    var msg = "ReactionConfig " + reactionConfigIdent + " not found or no field configurations are defined.";
    log.error(msg);
    throw (msg); 
}
//TODO: use JOLT For this 
reactionConfig = reactionConfig[0];
log.debug('reactionConfig' + JSON.stringify(reactionConfig));
var transformedData = {};
for (var i=0; i<reactionConfig.fields.length; i++){
    var field = reactionConfig.fields[i],
        transformFn = field.transform;
    
    log.debug('field' + JSON.stringify(field) + JSON.stringify(sourceData));
    if (transformFn){
        log.debug('trasnformFn' + transformFn);
        var fieldValue = SysUtility.postToFunction(transformFn, null, {
            field: field,
            data: sourceData
        });
    } else {
        if (!field.source_field){
            transformedData[field.target_field] = field.defaultValue; 
        } else {
            var val = sourceData[field.source_field];
            if (val !== undefined){
                log.debug('x' + val + field.source_field + JSON.stringify(sourceData));
                if (field.mappings && field.mappings.length > 0){
                    for (var j=0; j<field.mappings.length; j++){
                        if (val === field.mappings[j].source_value){
                            val = field.mappings[j].target_value; 
                            j=field.mappings.length; 
                        }
                    }
                }
                transformedData[field.target_field] = val;
            }
        }
    }
}
log.debug('trasnformedData ' + JSON.stringify(transformedData));
return transformedData; 
