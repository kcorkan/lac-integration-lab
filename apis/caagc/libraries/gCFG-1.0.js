var gCFG = {
    setAuthToken: function(token){
        this.authHeaders = {
            "headers": {
                "Authorization": "CALiveAPICreator " + token + ":1"
            }
        };
    },
    initialize: function(key, value){
        this[key] = value;
    }
};


