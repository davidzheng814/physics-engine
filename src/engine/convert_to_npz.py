import os
import json
import numpy as np
import argparse
import glob

parser = argparse.ArgumentParser('Generate Physics Training Data')
parser.add_argument('--input-dir', type=str, default='../jsons/')
parser.add_argument('--output-dir', type=str, default='../training/')
parser.add_argument('--frames', type=int, default=4)

args = parser.parse_args()

def get_obj_state(state):
    return [state['pos'][0]['x'], state['pos'][0]['y'],
            state['vel'][0]['x'], state['vel'][0]['y'],
            state['pos'][1]['x'], state['pos'][1]['y'],
            state['vel'][1]['x'], state['vel'][1]['y']]

def convert_to_npz(input_file, output_file):
    with open(input_file) as f:
        data = json.loads(f.read())

    states = data['states']
    obj_states = [get_obj_state(x) for x in states]

    # (num_samples, num_frames, obj_states (pos1, vel1, pos2, vel2))
    x = []
    for t in range(args.frames, len(obj_states) + 1):
        x.append(obj_states[t-args.frames:t])

    x = np.array(x)
    y = np.array(data['masses'][0])

    np.savez(output_file, x=x, y=y)

if __name__ == '__main__':
    if not os.path.exists(args.output_dir):
        os.makedirs(args.output_dir)

    files = glob.glob(args.input_dir + '/*.json')
    for input_file in files:
        output_file = os.path.join(args.output_dir, os.path.splitext(os.path.basename(input_file))[0])
        convert_to_npz(input_file, output_file)

