@echo off
echo SELECT 1 AS test; | C:\mariadb\bin\mysql.exe -u root --protocol=tcp -P 3306 2>&1
