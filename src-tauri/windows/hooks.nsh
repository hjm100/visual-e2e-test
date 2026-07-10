; 安装完成后删除 NSIS 安装包自身
!macro NSIS_HOOK_POSTINSTALL
  ClearErrors
  Delete "$EXEPATH"
  Delete /REBOOTOK "$EXEPATH"
!macroend
