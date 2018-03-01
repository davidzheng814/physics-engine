import json
import glob
import numpy as np

def get_json(input_file):
    with open(input_file) as f:
        json_data = json.loads(f.read())
    return json_data

def get_arr(sample):
    ro_x_true = []
    for state in sample['ro_states']:
        ro_x_true.append([[state['pos'][ind]['x'], state['pos'][ind]['y'], state['vel'][ind]['x'], state['vel'][ind]['y']] for ind in range(len(state['pos']))])

    ro_x_pred = []
    for state in sample['mean_states']:
        ro_x_pred.append([[state['pos'][ind]['x'], state['pos'][ind]['y'], state['vel'][ind]['x'], state['vel'][ind]['y']] for ind in range(len(state['pos']))])

    y_true = sample['encs']

    return ro_x_pred, ro_x_true, y_true

DIR = '/data/vision/billf/object_interaction/phys/davidzheng/data_r/jsons_mean_9/'
files = glob.glob(DIR+'/*')

ro_x_preds = []
ro_x_trues = []
y_trues = []
for filename in files:
    print filename
    json_data = get_json(filename)
    for sample in json_data:
        ro_x_pred, ro_x_true, y_true = get_arr(sample)
        ro_x_preds.append(ro_x_pred)
        ro_x_trues.append(ro_x_true)
        y_trues.append(y_true)

ro_x_pred = np.stack(ro_x_preds)
ro_x_true = np.stack(ro_x_trues)
y_true = np.stack(y_trues)

np.savez('/data/vision/billf/object_interaction/phys/davidzheng/ro_r_mean9', y_true=y_true, ro_x_pred=ro_x_pred, ro_x_true=ro_x_true)
