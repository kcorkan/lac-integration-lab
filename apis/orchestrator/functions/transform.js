log.info('[Orchestrator API][Function:transform] configIdent=' + parameters.configIdent + ' sourceAction=' + parameters.sourceAction + ' data=' + parameters.sourceData );  
var NULL_VALUE_STR = "nil";  //String that will represent a null value in the mappings 
var reactionConfig = SysUtility.getResource('reactionConfig',{sysfilter: "equal(ident:" + parseInt(parameters.configIdent) + ")"});
    
if (!reactionConfig || reactionConfig.length === 0){ 
    log.error("ReactionConfig " + parameters.configIdent + " not found or no field configurations are defined."); 
    throw ("ReactionConfig " + parameters.configIdent + " not found or no field configurations are defined."); 
}

reactionConfig = reactionConfig[0];
log.debug('[Orchestrator API][Function:transform] reactionConfig: ' + JSON.stringify(reactionConfig));
var transformedData = {},
    sourceData = JSON.parse(parameters.sourceData),
    sourceAction = parameters.sourceAction.toUpperCase(),
    changedData = sourceData.changed,
    stateData = sourceData.state;

  
if (sourceAction === "DELETE" && reactionConfig.on_delete){
    transformedData = {"deleted": sourceData.deleted}; //TODO This is not right --
    return transformedData; 
}    

for (var i=0; i<reactionConfig.fields.length; i++){
    var field = reactionConfig.fields[i],
        transformFn = field.transform;
        log.info('[Orchestrator API][Function:transform] source/target field' + field.source_field + ' / ' + field.target_field);
    if ((field.on_create && sourceAction === "INSERT") || (field.on_update && sourceAction === "UPDATE")){

        if (!field.source_field && field.default_value){
            transformedData[field.target_field] = field.default_value; 
        } else {
            log.info('[Orchestrator API][Function:transform] changedData[' + field.source_field + '] = ' + changedData[field.source_field]);
    
            if (changedData[field.source_field] !== undefined){
                //Deal with mapping null values 
                var val = changedData[field.source_field];

                if (field.mappings && field.mappings.length > 0){
                    log.info('[Orchestrator API][Function:transform] field.mappings= ' + JSON.stringify(field.mappings));
    
                /* If there are field mappings, then do a mapping and we will use regular expressions */
                    transformedData[field.target_field] = null;
                    val = val || NULL_VALUE_STR;
                    _.each(field.mappings, function(fm){
                        var source_value = new RegExp("^" + fm.source_value + "$");
                        var matches = val.match(source_value);
                        log.debug('[Orchestrator API][Function:transform] matches ' + matches + val + source_value + fm.target_value);
                        if (matches && matches.length > 0){
                            transformedData[field.target_field] = val.replace(source_value,fm.target_value);
                            return false; 
                        }
                    });
                    //If there is a mapping for the field, then the target field will hold the mapped value
                    //If there is a mapping for the field, but the source value is not mapped, then the default value will be assigned.  
                    //If there is a mapping for the field, but the source value is not mapped and no default value exists, then the source value will remain the same.  

                    transformedData[field.target_field] = transformedData[field.target_field] || field.default_value || val || NULL_VALUE_STR; 
                    log.info('[Orchestrator API][Function:transform] inside field.mappings transformedData for target field ' + transformedData[field.target_field]);
                    if (transformedData[field.target_field] === NULL_VALUE_STR){
                        transformedData[field.target_field] = null;
                    }
                } else {
                    transformedData[field.target_field] = val || field.default_value || null;
                }
                log.info('[Orchestrator API][Function:transform] transformedData[' + field.target_field + '] = ' + transformedData[field.target_field]);
    
                 if (transformFn){
                    var params = {
                        configIdent: reactionConfig.ident,
                        field: field.target_field,
                        data: JSON.stringify(transformedData)
                    };
                    
                     switch(transformFn){
                        case "transformProjectOrTeam":
                            params.data = JSON.stringify(stateData); 
                            break;
                        case "transformMultiFieldConcat":
                            params.field = field.source_field ;
                            params.data = JSON.stringify(stateData); 
                            params.inputValue = field.default_value;   
                            break;
                        
                        default: 
                    }
                   
                    log.info('[Orchestrator API][Function:transform] transformFn= ' + transformFn + ' params=' + JSON.stringify(params));
                    var val = SysUtility.getFunction(transformFn, params);
                    log.info('[Orchestrator API][Function:transform] transformFn result = ' + val);
    
                    val = JSON.parse(val);
                    transformedData[field.target_field] = val; 
                } // if (transformFn)
            } // if (changedData[field.source_field] !== undefined)
        } //if (!source_field)
    } //we want to update or insert this 
} //for 
log.info('[Orchestrator API][Function:transform] transformedData= ' + JSON.stringify(transformedData));
return transformedData; 
