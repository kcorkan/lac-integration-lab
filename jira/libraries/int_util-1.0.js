var integrationUtility = {
    // doPut and doPost are here because in some instances Jira returns
    // an empty string for a put/post and the SysUtility chokes on it.
    doPut: function(url, params, settings, data) {
        // Now invoke a PUT using the Apache Commons library directly
        var clientBuilder = Java.type("org.apache.http.impl.client.HttpClientBuilder").create();
        var client = clientBuilder.build();
        var HttpPut = Java.type("org.apache.http.client.methods.HttpPut");
        var putReq = new HttpPut(url);
        if ( settings.headers ) {
            var headers = settings.headers;
            for ( var i in headers ) {
                putReq.setHeader(i,headers[i]);
            }
        }

        var payload = JSON.stringify(data);
        var StringEntity = Java.type("org.apache.http.entity.StringEntity");
        var entity = new StringEntity(payload);
        putReq.setEntity(entity);
        var response = client.execute(putReq);

        if (response.getStatusLine().getStatusCode() > 299) {
            return {
                status: "Error - call failed",
                statusCode: response.getStatusLine().getStatusCode(),
                error: this._readEntity(response),
                errorMessage: this._readEntity(response)
            };
        }

        return this._readEntity(response);
    },
    
     doDelete: function(url, params, settings) {
        // Now invoke a PUT using the Apache Commons library directly
        var clientBuilder = Java.type("org.apache.http.impl.client.HttpClientBuilder").create();
        var client = clientBuilder.build();
        var HttpDelete = Java.type("org.apache.http.client.methods.HttpDelete");
        var delReq = new HttpDelete(url);
        if ( settings.headers ) {
            var headers = settings.headers;
            for ( var i in headers ) {
                delReq.setHeader(i,headers[i]);
            }
        }

        var response = client.execute(delReq);

        if (response.getStatusLine().getStatusCode() > 299) {
            return {
                status: "Error - call failed",
                statusCode: response.getStatusLine().getStatusCode(),
                error: this._readEntity(response),
                errorMessage: this._readEntity(response)
            };
        }

        return this._readEntity(response);
    },

    _readEntity: function(response){
        var InputStreamReader = Java.type("java.io.InputStreamReader");
        if ( !response.getEntity() ) {
            return {};
        }
        var inStr = new InputStreamReader(response.getEntity().getContent());
        var BufferedReader = Java.type("java.io.BufferedReader");
        var rd = new BufferedReader(inStr);
        var json = "";
        var line = rd.readLine();
        while (line !== null) {
            json += line;
            line = rd.readLine();
        }

        return json;
    },
     doPost: function(url, params, settings, data) {
        // Now invoke a POST using the Apache Commons library directly
        var clientBuilder = Java.type("org.apache.http.impl.client.HttpClientBuilder").create();
        var client = clientBuilder.build();
        var HttpPost = Java.type("org.apache.http.client.methods.HttpPost");
        var postReq = new HttpPost(url);
        if ( settings.headers ) {
            var headers = settings.headers;
            for ( var i in headers ) {
                postReq.setHeader(i,headers[i]);
            }
        }

        var payload = JSON.stringify(data);
        var StringEntity = Java.type("org.apache.http.entity.StringEntity");
        var entity = new StringEntity(payload);
        postReq.setEntity(entity);
        var response = client.execute(postReq);
        log.debug("doPut response: " + response);
        if (response.getStatusLine().getStatusCode() > 299) {
            return {
                status: "Error - call failed",
                statusCode: response.getStatusLine().getStatusCode()
            };
        }
        var InputStreamReader = Java.type("java.io.InputStreamReader");
        if ( !response.getEntity() ) {
            return {};
        }
        var inStr = new InputStreamReader(response.getEntity().getContent());
        var BufferedReader = Java.type("java.io.BufferedReader");
        var rd = new BufferedReader(inStr);
        var json = "";
        var line = rd.readLine();
        while (line !== null) {
            json += line + "\n";
            line = rd.readLine();
        }
        log.debug('result from doPost call - ' + json);
        return json;
    }
}
