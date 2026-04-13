@echo off
echo CREATE DATABASE IF NOT EXISTS nexus CHARACTER SET utf8mb4; | C:\mariadb\bin\mysql.exe -u root --protocol=tcp -P 3306
echo CREATE USER IF NOT EXISTS 'nexus_user'@'localhost' IDENTIFIED BY 'nexus_local_pw'; | C:\mariadb\bin\mysql.exe -u root --protocol=tcp -P 3306
echo GRANT ALL PRIVILEGES ON nexus.* TO 'nexus_user'@'localhost'; FLUSH PRIVILEGES; | C:\mariadb\bin\mysql.exe -u root --protocol=tcp -P 3306
echo Database and user created.
