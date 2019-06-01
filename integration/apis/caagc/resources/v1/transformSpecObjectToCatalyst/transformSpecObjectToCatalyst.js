var spec = {
      "*": {
        "last_updated": "[&1].last_updated",
        "xref_id": "[&1].xref_id",
        "object_uuid": "[&1].source_object_id",
        "system_ident": "[&1].source_system_ident",
        "object_type": "[&1].source_object_type",
        "fields": {
          "*": {
            "user_value": "[&3].source_data.@(1,fieldDef.name)"
          }
        },
        "collections": {
          "*": {
            "user_value": "[&3].source_data.@(1,fieldDef.name)[]"
          }
        }
      }
    };
    
spec["*"]["#" + SysUtility.getApiInfo().urlFragment] = "[&1].source_api_def_ident";

return spec;
      
