import sys
import random
import json

SEND_PFX = "SEND:"
actions = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'STOP']
num_iters = 500
num_actions = len(actions)
for i in range(num_iters):
    line = sys.stdin.readline()
    if not line.startswith(SEND_PFX):
        continue

    payload = json.loads(line[len(SEND_PFX):])
    delx = payload["obj1"]["pos"][0] - payload["actor"]["pos"][0]
    dely = payload["obj1"]["pos"][1] - payload["actor"]["pos"][1]

    if abs(delx) > abs(dely):
        if delx > 0:
            print SEND_PFX + "RIGHT"
        else:
            print SEND_PFX + "LEFT"
    else:
        if dely > 0:
            print SEND_PFX + "DOWN"
        else:
            print SEND_PFX + "UP"
    
    sys.stdout.flush()

print SEND_PFX + "END"
sys.stdout.flush()
