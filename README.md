# Lab: Getting Started

## Prerequisites 
 You are running the Live API Creator server locally 

## Installation Instructions 
1.  Stop the Live API Creator server
2.  Clone the repository into a local repository outside of the Live API Creator Server folder structure 
3.  Change directory to the cloned git repository 
4.  Copy the Integration Derby database into the Live API Creator Server folder:
    ```
    cp -f ./UserFiles/Integration <Live API Creator Folder>/CALiveAPICreator/
    ```
5.  Copy the ./integration folder into the Live API Creator Server teamspaces folder:
   ``` 
   cp -f ./integration <Live API Creator Folder>/CALiveAPICreator/jetty.repository/teamspaces 
   ```
6.  Start the Live API Creator Server 
7.  Logout of the Live API Creator Server (if logged in)
8.  Login to the Live API Creator Server with the credentials:

![ScreenShot](/images/login.png, "CA Live API Creator Login")

9.  You should see the following 3 APIs:
* Agile Central API
* Jira API
* Orchestrator API 
