@echo off
title GitHub Auto-Push (Entrenador Leyenda)
color 0A
echo ===================================================
echo  🚀 ENTRENADOR LEYENDA - AUTO COMMIT & AUTO PUSH
echo ===================================================
echo.
echo Guardando y monitoreando cambios automaticamente...
echo Presiona Ctrl + C para detener cuando quieras.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "^
  $watcher = New-Object System.IO.FileSystemWatcher; ^
  $watcher.Path = '%~dp0'; ^
  $watcher.IncludeSubdirectories = $true; ^
  $watcher.EnableRaisingEvents = $true; ^
  $action = { ^
    $path = $Event.SourceEventArgs.FullPath; ^
    if ($path -like '*\.git\*') { return }; ^
    Write-Host '[AUTO-PUSH] Cambio detectado. Procesando...' -ForegroundColor Yellow; ^
    Start-Sleep -Seconds 3; ^
    Set-Location '%~dp0'; ^
    git add .; ^
    $status = git status --porcelain; ^
    if ($status) { ^
      $msg = 'Auto-update ' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'); ^
      git commit -m $msg; ^
      git push origin main; ^
      Write-Host '✅ ¡Subido a GitHub exitosamente!' -ForegroundColor Green; ^
    } ^
  }; ^
  Register-ObjectEvent $watcher 'Changed' -Action $action | Out-Null; ^
  Register-ObjectEvent $watcher 'Created' -Action $action | Out-Null; ^
  Register-ObjectEvent $watcher 'Deleted' -Action $action | Out-Null; ^
  while ($true) { Start-Sleep -Seconds 1 } ^
"
