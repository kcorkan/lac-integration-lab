return {
      "projects": {
        "*": {
          "issuetypes": {
            "*": {
              "fields": {
                "*": {
                  "key": "@(1,key).id[]",
                  "name": "@(1,key).name[]",
                  "schema": { "type": "@(2,key).schema_type[]" },
                  "@(4,key)": "@(1,key).projects[]"
                }
              }
            }
          }
        }
      }
    };
