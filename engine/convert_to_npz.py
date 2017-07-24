import os
import json
import numpy as np
import argparse
import glob

parser = argparse.ArgumentParser('Generate Physics Training Data')
parser.add_argument('--input-dir', type=str, default='../jsons/')
parser.add_argument('--output-dir', type=str, default='../training/')

args = parser.parse_args()

def get_obj_state(state, ind):
    return [state['pos'][ind]['x'], state['pos'][ind]['y'],
            state['vel'][ind]['x'], state['vel'][ind]['y']]

def convert_to_npz(input_file, output_file):
    with open(input_file) as f:
        data = json.loads(f.read())

    states = data['states']
    x = [[get_obj_state(state, obj_ind) for obj_ind in range(len(state['pos']))] 
         for state in states]

    # (num_samples, n_objects, (posx, posy, velx, vely))
    x = np.array(x)
    y = np.array(data['masses'])

    np.savez(output_file, x=x, y=y)

if __name__ == '__main__':
    if not os.path.exists(args.output_dir):
        os.makedirs(args.output_dir)

    files = glob.glob(args.input_dir + '/*.json')
    for input_file in files:
        print input_file
        output_file = os.path.join(args.output_dir, os.path.splitext(os.path.basename(input_file))[0])
        convert_to_npz(input_file, output_file)

