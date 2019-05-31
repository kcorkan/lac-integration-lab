return {
      "inwardLinks": {
        "*": {
          "fieldDef": {
            "name": "[&2].type.name"
          },
          "inwardObject": {
            "object_id": "[&2].inwardIssue.id"
          },
          "@(2,object_id)": "[&1].outwardIssue.id"
        }
      }
    };
