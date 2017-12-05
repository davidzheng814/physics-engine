import os
import json
import numpy as np
import argparse
import glob
import h5py

parser = argparse.ArgumentParser('Generate Physics Training Data')
parser.add_argument('--input-dir', type=str, default='../jsons/')
parser.add_argument('--long-input-dir', type=str)
parser.add_argument('--output-file', type=str, default='data.h5')
parser.add_argument('--num-obs-frames', type=int, default=50)
parser.add_argument('--num-objects', type=int, default=3)

args = parser.parse_args()

def get_obj_state(state, ind):
    return [state['pos'][ind]['x'], state['pos'][ind]['y'],
            state['vel'][ind]['x'], state['vel'][ind]['y']]

def convert_to_npz(input_file):
    with open(input_file) as f:
        data = json.loads(f.read())

    # (num_object_pairs, num_samples, n_objects, (posx, posy, velx, vely))
    pred_x = [[[get_obj_state(state, obj_ind) for obj_ind in range(args.num_objects)] 
             for state in states] for states in data['all_states']]
    pred_x = np.array(pred_x)

    # (num_samples, n_objects, (posx, posy, velx, vely))
    enc_x = [[get_obj_state(state, obj_ind) for obj_ind in range(args.num_objects)] 
              for state in data['enc_states']]
    enc_x = np.array(enc_x)

    y = np.array(data['constants'], dtype='f')

    return pred_x, enc_x, y

def to_encs(encs_json):
    return np.array(encs_json, dtype='f')

def to_obs_states(obs_states_json):
    obs_x = [[get_obj_state(state, obj_ind) for obj_ind in range(args.num_objects)] 
              for state in obs_states_json]
    obs_x = np.array(obs_x, dtype='f')

    return obs_x

def to_ro_states(ro_states_json):
    ro_x = [[[get_obj_state(state, obj_ind) for obj_ind in range(args.num_objects)] 
              for state in states] for states in ro_states_json]
    ro_x = np.array(ro_x, dtype='f')

    return ro_x

def to_obs_collisions(obs_collisions_json):
    obs_collisions = np.zeros((args.num_obs_frames, args.num_objects), dtype='?')

    for step, objects in obs_collisions_json:
        obs_collisions[step, objects] = True

    return obs_collisions

def to_npz(json_data, names):
    arr = []
    for name in names:
        if name == 'encs':
            arr.append(to_encs(json_data['encs']))
        elif name == 'obs_states':
            arr.append(to_obs_states(json_data['obs_states']))
        elif name == 'ro_states':
            arr.append(to_ro_states(json_data['ro_states']))
        elif name == 'mean_states':
            arr.append(to_mean_states(json_data['mean_states']))
        elif name == 'obs_collisions':
            arr.append(to_obs_collisions(json_data['obs_collisions']))

    return arr

def to_npzs(json_data, names):
    if isinstance(json_data, list):
        arrs = [to_npz(x, names) for x in json_data]
    else:
        arrs = [to_npz(json_data, names)]

    return arrs

def get_json(input_file):
    with open(input_file) as f:
        json_data = json.loads(f.read())
    return json_data

def get_names(json_data):
    if isinstance(json_data, list):
        return json_data[0].keys()
    return json_data.keys()

def create_dataset(name, array, f):
    DSET_NAME_AND_TYPE = {
        'encs': ('y', 'f'),
        'obs_states': ('obs_x', 'f'),
        'ro_states': ('ro_x', 'f'),
        'mean_states': ('mean_x', 'f'),
        'obs_collisions': ('col', '?'),
    }

    dset_name, dtype = DSET_NAME_AND_TYPE[name]

    f.create_dataset(dset_name, array.shape, dtype=dtype)
    f[:] = array

def create_datasets(names, arrays, f):
    for i, name in enumerate(names):
        array = np.stack([x[i] for x in arrays])
        create_dataset(name, array, f)

if __name__ == '__main__':
    files = glob.glob(args.input_dir + '/*.json')
    arrays = []
    names = get_names(get_json(files[0]))
    for i, input_file in enumerate(files):
        arrays.extend(to_npzs(get_json(input_file), names))

    with h5py.File(args.output_file, 'w') as f:
        create_datasets(names, arrays, f)

