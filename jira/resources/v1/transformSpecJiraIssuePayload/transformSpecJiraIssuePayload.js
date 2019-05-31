return {
      "fields": {
        "*": {
          "fieldDef": {
            "schema_type": {
              "option": {
                "@(3,system_value)": "fields.@(3,id).value"
              },
              "project": {
                "@(3,system_value)": "fields.project.@(3,system_attribute)" //This needs to match the user value attribute for project
              },
              "status": {
                "@(3,user_value)": "fields.@(3,id)"
              },
              "*": {
                "@(3,system_value)": "fields.@(3,id)"
              }
            }
          }
        }
      },
      "object_type": "fields.issuetype.name"
  };
