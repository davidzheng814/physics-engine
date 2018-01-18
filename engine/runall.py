import subprocess
import os

cmd1 = 'node physics.js -n '
cmd2 = ' --physics collision --num-bodies 6 --fix-first --batch --all-collide -o /data/vision/oliva/scenedataset/urops/scenelayout/jsons/data -s '
# cmd2 = ' --physics collision --num-bodies 3 --fix-first --batch --min-collide -o /data/vision/oliva/scenedataset/urops/scenelayout/jsons2/data -s '
procs = []
n = 1000000
step = 50000
for i in range(0, n, step):
    fullcmd = cmd1 + str(i+step) + cmd2 + str(i)
    print(fullcmd)
    proc = subprocess.Popen(fullcmd, shell=True)
    procs.append(proc)

for proc in procs:
    proc.wait()
