aws workspaces stop-workspaces --stop-workspace-requests WorkspaceId=ws-wp6n1c25n >> batchOutput.txt 2>&1
Rem The line above is used to stop environments, the line below is used to terminate environments (can't recover after terminated')
Rem ***Uncomment line 4 when ready***
Rem aws workspaces terminate-workspaces --terminate-workspace-requests ws-wp6n1c25n >> batchOutput.txt 2>&1