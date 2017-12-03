import h5py
import sys

f = h5py.File(sys.argv[1], 'a')
g = h5py.File(sys.argv[2], 'r')

for prop in ['pred_x', 'enc_x', 'y']:
    if prop+'_long' not in f:
        a = f.create_dataset(prop+'_long', g[prop].shape, dtype=g[prop].dtype)
    else:
        a = f[prop+'_long']
    a[:] = g[prop][:]

f.close()
g.close()

