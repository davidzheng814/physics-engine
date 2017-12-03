import h5py
import sys

f = h5py.File(sys.argv[1], 'a')
g = h5py.File(sys.argv[2], 'r')

for prop in ['pred_x', 'enc_x', 'y', 'enc_col']:
    a = f.create_dataset(prop+'_long', g[prop].shape, dtype=g[prop].dtype)
    a[:] = g[prop][:]

f.close()
g.close()
