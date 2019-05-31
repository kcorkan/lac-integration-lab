if (logicContext.getInitialVerb() !== "DELETE"){

    var rowParent = row.getParent('cfg_obj');
    
    //If from an automated test --- don't validate
    if (/\_test\_/.test(rowParent.name)){ return true; }
    
    //Prime error details
    ErrorDetails = {
        "label": "Source",
        "field": row.source_field,
        "object_type": rowParent.source_obj_type,
        "errorMessage": ""
    };
    
    if (row.source_field){
        try {
            var sourceApi = SysUtility.getFunction('getApiConfig',{apiIdent: rowParent.source_api_def_ident}),
            sourceParams = {
                field: encodeURI(row.source_field),
                objectType: encodeURI(rowParent.source_obj_type)
            };
            
            sourceApi = JSON.parse(sourceApi);
            
            var validateUrl = sourceApi.baseUrl + 'system/' + rowParent.source_system_ident + '/validateField';
            log.debug(validateUrl + JSON.stringify(sourceParams));
            
            log.info('a');
            var sourceFieldInfo = SysUtility.restGet(validateUrl, sourceParams, sourceApi.authHeaders);
            log.debug(sourceFieldInfo);
            
            if (!sourceFieldInfo || sourceFieldInfo == "{}" ){ 
                log.info('There is no source field info result');
                ErrorDetails.errorMessage = "There is no source field info result";
                return false; 
            }

            sourceFieldInfo = JSON.parse(sourceFieldInfo);
            if (!sourceFieldInfo.name){
                ErrorDetails.errorMessage = "There is not a name on the source field";
                return false; 
            }
            log.info('c');
            row.source_field = sourceFieldInfo.name;

        } catch (e){
            ErrorDetails.errorMessage = ".  More Info: " + e;
            return false;
        }
    } //if row.source_field

log.info('here');
//prime error details for target 
ErrorDetails = {
    "label": "Target",
    "field": row.target_field,
    "object_type": rowParent.target_obj_type,
    "errorMessage": ""
};

log.info('validate...' + rowParent.target_api_def_ident);

if ( rowParent.target_api_def_ident === 0 ) {
    log.info("Skipping validation of target fields");
    return true;
}
try {

    var targetApi = SysUtility.getFunction('getApiConfig',{apiIdent: rowParent.target_api_def_ident}),
        targetParams = {
            field: encodeURI(row.target_field),
            objectType: rowParent.target_obj_type
        };
        log.debug('targetApi ' + targetApi);
        targetApi = JSON.parse(targetApi);
        if ( rowParent.target_system_ident === 0 ) {
            ErrorDetails.errorMessage = "Skip because there is no system";
            return true;
        }
        var targetFieldInfo = SysUtility.restGet(targetApi.baseUrl + 'system/' + rowParent.target_system_ident + '/validateField', targetParams, targetApi.authHeaders);
        if (!targetFieldInfo){ return false; }
        
        targetFieldInfo = JSON.parse(targetFieldInfo);
        if (!targetFieldInfo.name){ return false; }
        row.target_field = targetFieldInfo.name;
        
    } catch (e){
        ErrorDetails.errorMessage = ".  More Info: " + e;
        log.error("Validation:ValidateNotRunFromTest: " + ErrorDetails.errorMessage);
        return false; 
    } 

}
return true; 
