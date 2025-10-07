@ECHO OFF
SET DIR=%~dp0
SET JAR=%DIR%\gradle\wrapper\gradle-wrapper.jar
IF NOT EXIST "%JAR%" (
  ECHO gradle-wrapper.jar not found. Run "npx cap add android" or "gradle wrapper" to regenerate.
  EXIT /B 1
)
IF NOT "%JAVA_HOME%"=="" (
  SET JAVA_CMD="%JAVA_HOME%\bin\java.exe"
) ELSE (
  SET JAVA_CMD=java
)
%JAVA_CMD% -jar "%JAR%" %*
