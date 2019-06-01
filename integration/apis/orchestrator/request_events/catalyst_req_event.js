// Insert request event handling code here
if (req.resourceName == "catalyst"){
    if (req.verb == "PUT"){
        var obj = JSON.parse(json);
        if (!_.isArray(obj)){
            obj = [obj];
        }
         
          _.each(obj, function(o){
            o['@metadata'] = {"action":"MERGE_INSERT", "key":['source_object_id','source_object_type','source_api_def_ident','source_system_ident','last_updated']};
          });
          
        json = JSON.stringify(obj);
        log.debug('json' + json);
    } 
}
