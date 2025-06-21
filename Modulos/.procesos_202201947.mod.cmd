savedcmd_procesos_202201947.mod := printf '%s\n'   procesos_202201947.o | awk '!x[$$0]++ { print("./"$$0) }' > procesos_202201947.mod
