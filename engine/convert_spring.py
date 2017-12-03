import os
import json
import numpy as np
import argparse
import glob
import h5py

parser = argparse.ArgumentParser('Generate Physics Training Data')
parser.add_argument('--input-dir', type=str, default='../jsons/')
parser.add_argument('--output-file', type=str, default='data.h5')
parser.add_argument('--num-enc-steps', type=int, default=50)

args = parser.parse_args()

def get_obj_state(state, ind):
    return [state['pos'][ind]['x'], state['pos'][ind]['y'],
            state['vel'][ind]['x'], state['vel'][ind]['y']]

def convert_to_npz(input_file):
    with open(input_file) as f:
        data = json.loads(f.read())

    # (num_object_pairs, num_samples, n_objects, (posx, posy, velx, vely))
    pred_x = [[[get_obj_state(state, obj_ind) for obj_ind in range(len(state['pos']))] 
             for state in states] for states in data['all_states']]
    pred_x = np.array(pred_x)

    # (num_samples, n_objects, (posx, posy, velx, vely))
    enc_x = [[get_obj_state(state, obj_ind) for obj_ind in range(len(state['pos']))] 
              for state in data['enc_states']]
    enc_x = np.array(enc_x)

    y = np.array(data['constants'])

    return pred_x, enc_x, y

if __name__ == '__main__':
    f = h5py.File(args.output_file, 'w')
    files = glob.glob(args.input_dir + '/*.json')

    pred_x0, enc_x0, y0 = convert_to_npz(files[0])

    pred_xs = f.create_dataset('pred_x', (len(files),) + pred_x0.shape, dtype='f')
    enc_xs = f.create_dataset('enc_x', (len(files),) + enc_x0.shape, dtype='f')
    ys = f.create_dataset('y', (len(files),) + y0.shape, dtype='f')

    for i, input_file in enumerate(files):
        print input_file
        pred_x, enc_x, y = convert_to_npz(input_file)
        pred_xs[i] = pred_x
        enc_xs[i] = enc_x
        ys[i] = y

    f.close()

