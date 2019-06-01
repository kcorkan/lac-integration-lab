return {
      "outwardLinks": {
        "*": {
          "fieldDef": {
            "name": "[&2].type.name"
          },
          "outwardObject": {
            "object_id": "[&2].outwardIssue.id"
          },
          "@(2,object_id)": "[&1].inwardIssue.id"
        }
      }
    };
