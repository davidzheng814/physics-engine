import sys
import random


SEND_PFX = "SEND:"
actions = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'STOP']
num_iters = 500
num_actions = len(actions)
last_action = actions[random.randint(0, num_actions-1)]
for i in range(num_iters):
    line = sys.stdin.readline()
    if not line.startswith(SEND_PFX):
        continue
    
    if random.random() > 0.6:
        last_action = actions[random.randint(0, num_actions-1)]
    print SEND_PFX + last_action
    sys.stdout.flush()

print SEND_PFX + "END"
sys.stdout.flush()
