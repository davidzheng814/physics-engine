import os
import json
import numpy as np
import argparse
import glob
import h5py
from os.path import join

parser = argparse.ArgumentParser('Generate Physics Training Data')
parser.add_argument('--root-folder', type=str)
parser.add_argument('--output-file', type=str)
parser.add_argument('--num-obs-frames', type=int, default=50)

args = parser.parse_args()

def get_obj_state(state, ind):
    return [state['pos'][ind]['x'], state['pos'][ind]['y'],
            state['vel'][ind]['x'], state['vel'][ind]['y']]

def to_encs(encs_json):
    return np.array(encs_json, dtype='f')

def to_obs_states(obs_states_json, n_objects):
    obs_x = [[get_obj_state(state, obj_ind) for obj_ind in range(n_objects)] 
              for state in obs_states_json[-args.num_obs_frames:]]
    obs_x = np.array(obs_x, dtype='f')

    return obs_x

def to_ro_states(ro_states_json, n_objects):
    ro_x = [[get_obj_state(state, obj_ind) for obj_ind in range(n_objects)]
              for state in ro_states_json]
    ro_x = np.array(ro_x, dtype='f')

    return ro_x

def to_obs_collisions(obs_collisions_json, n_objects):
    obs_collisions = np.zeros((args.num_obs_frames, n_objects), dtype='?')

    for step, objects in obs_collisions_json:
        obs_collisions[step, objects] = True

    return obs_collisions

def to_npz(json_data, names, n_objects):
    arr = []
    for name in names:
        if name == 'encs':
            arr.append(to_encs(json_data['encs']))
        elif name == 'obs_states':
            arr.append(to_obs_states(json_data['obs_states'], n_objects))
        elif name == 'ro_states':
            arr.append(to_ro_states(json_data['ro_states'], n_objects))
        elif name == 'obs_collisions':
            arr.append(to_obs_collisions(json_data['obs_collisions'], n_objects))

    return arr

def to_npzs(json_data, names, n_objects):
    if isinstance(json_data, list):
        arrs = [to_npz(x, names, n_objects) for x in json_data]
    else:
        arrs = [to_npz(json_data, names, n_objects)]

    return arrs

def get_json(input_file):
    with open(input_file) as f:
        json_data = json.loads(f.read())
    return json_data

def get_names(json_data):
    if isinstance(json_data, list):
        return json_data[0].keys()
    return json_data.keys()

def get_n_objects(json_data):
    if isinstance(json_data, list):
        return len(json_data[0]['obs_states'][0]['pos'])
    return len(json_data['obs_states'][0]['pos'])

def create_dataset(name, array, f, sfx=''):
    DSET_NAME_AND_TYPE = {
        'encs': ('y', 'f'),
        'obs_states': ('obs_x', 'f'),
        'ro_states': ('ro_x', 'f'),
        'mean_states': ('mean_x', 'f'),
        'obs_collisions': ('col', '?'),
    }

    dset_name, dtype = DSET_NAME_AND_TYPE[name]
    dset_name += sfx

    dset = f.create_dataset(dset_name, array.shape, dtype=dtype)
    dset[:] = array

def create_datasets(names, arrays, f, sfx=''):
    for i, name in enumerate(names):
        array = np.stack([x[i] for x in arrays])
        create_dataset(name, array, f, sfx=sfx)

if __name__ == '__main__':
    data_paths = [
        ('jsons_default_mass32', '_mass32'),
        ('jsons_default_3', '_obj3'),
        ('jsons_default_train', ''),
        ('jsons_default_9', '_obj9'),
        ('jsons_default_long', '_long'),
    ]

    for folder, sfx in data_paths:
        print(folder, sfx)
        files = glob.glob(join(args.root_folder, folder) + '/*.json')

        json0 = get_json(files[0])
        n_objects, names = get_n_objects(json0), get_names(json0)
        print(n_objects)

        arrays = []
        for i, input_file in enumerate(files):
            print(input_file)
            arrays.extend(to_npzs(get_json(input_file), names, n_objects))

        with h5py.File(args.output_file, 'a') as f:
            create_datasets(names, arrays, f, sfx=sfx)

