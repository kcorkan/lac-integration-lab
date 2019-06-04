return {
    "fields": {
      "*": {
        "mappings": {
          "*": {
            "target_value": {
              "@": "@(4,target_field).@(2,source_value)"
            }
          }
        }
      }
    }
};
