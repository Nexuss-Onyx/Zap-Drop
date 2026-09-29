!macro NSIS_HOOK_POSTINSTALL
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Zapdrop"'
  nsExec::ExecToLog 'netsh advfirewall firewall add rule name="Zapdrop" dir=in action=allow program="$INSTDIR\Zapdrop.exe" enable=yes profile=any'
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  nsExec::ExecToLog 'netsh advfirewall firewall delete rule name="Zapdrop"'
!macroend
