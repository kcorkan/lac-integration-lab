return {
      "issueLink": {
        "issueLinkType": {
          "#LOOKUP": "field_ident.\\@metadata.action",
          "id": "field_ident.id",
          "@(3,system_ident)": "field_ident.system_ident",
          "#system_ident": "field_ident.\\@metadata.key",
          "#id": "field_ident.\\@metadata.key"
        },
        "sourceIssueId": {
          "@": "inward_ident.object_id",
          "@(2,system_ident)": "inward_ident.system_ident",
          "#LOOKUP": "inward_ident.\\@metadata.action",
          "#object_id": "inward_ident.\\@metadata.key",
          "#system_ident": "inward_ident.\\@metadata.key"
        },
        "destinationIssueId": {
          "@": "outward_ident.object_id",
          "@(2,system_ident)": "outward_ident.system_ident",
          "#LOOKUP": "outward_ident.\\@metadata.action",
          "#object_id": "outward_ident.\\@metadata.key",
          "#system_ident": "outward_ident.\\@metadata.key"
        }
      }
    };
