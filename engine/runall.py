import subprocess
import os

cmd1 = 'node physics.js -n '
cmd2 = ' --num-bodies 6 --batch -o /data/vision/billf/object_interaction/phys/davidzheng/data/jsons_default_train/data -s '
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

