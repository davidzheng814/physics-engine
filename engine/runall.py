import subprocess
import os

DIR = '/data/vision/billf/object_interaction/phys/davidzheng/data_r/'
no_rest = False
no_rest_flag = ' --one-restitution ' if no_rest else ''

cmd1 = 'node physics.js -n '
cmd2 = ' --num-bodies 9 --batch --predict-mean -o '+DIR+'jsons_mean_9/data -s '

procs = []
n = 100000
step = 10000
for i in range(0, n, step):
    fullcmd = cmd1 + str(i+step) + cmd2 + str(i) + no_rest_flag
    print(fullcmd)
    proc = subprocess.Popen(fullcmd, shell=True)
    procs.append(proc)

for proc in procs:
    proc.wait()

# cmds = [
#   'node physics.js -n 100000 --batch --num-bodies 3 -o '+DIR+'jsons_default_3/data' + no_rest_flag,
#   'node physics.js -n 100000 --batch --num-bodies 9 -o '+DIR+'jsons_default_9/data' + no_rest_flag,
#   'node physics.js -n 10 --p 300 -o '+DIR+'jsons_default_long/data' + no_rest_flag,
#   'node physics.js -n 5000 --num-bodies 2 --min-mass 16 --max-mass 32 -o '+DIR+'jsons_default_mass32/data' + no_rest_flag,
# ]
# 
# for cmd in cmds:
#     print(cmd)
#     proc = subprocess.Popen(cmd, shell=True)
#     proc.wait()
# 
