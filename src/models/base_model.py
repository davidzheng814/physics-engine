from __future__ import print_function

import tensorflow as tf
from tensorflow.python.framework import ops
from tensorflow.python.ops.control_flow_ops import with_dependencies
from tensorflow.contrib.layers import batch_norm
import numpy as np
import argparse
import logging
import os
import sys
import json
import scipy.ndimage
import random

logging.basicConfig(format='%(asctime)s %(message)s', level=logging.INFO)

NUM_IMG_CHANNELS = 3
NUM_FRAMES = 4
NUM_CHANNELS = NUM_IMG_CHANNELS * NUM_FRAMES
WIDTH = 400
HEIGHT = 400
NUM_MASSES = 3

NUM_EPISODES = 1000
ITERS_PER_EPS = 50
MIN_SAMPLES = 1000
BATCH_SIZE = 10 # batch size
LEARNING_RATE = 1e-4
BETA = 0.9

IMAGES = 'images/'
NUM_FILES = 2
NUM_TEST_POINTS = 10000
START_CHECKPOINT = None
CHECKPOINT_DIR = './ckpts/'
LOGS_DIR = './logs/'

SEND_PFX = "SEND:"

np.random.seed(1337)

def send(msg):
    print(SEND_PFX + str(msg))
    sys.stdout.flush()

def conv_block(inp, relu=False, leaky_relu=False, bn=False,
               output_channels=64, stride=1, kernel_size=3, is_training_cond=None,
               reuse=False, use_bias=False, dropout=None):
    inp_shape = inp.get_shape()
    kernel_shape = (kernel_size, kernel_size, inp_shape[-1], output_channels)
    strides = [1, stride, stride, 1]

    weights = tf.get_variable('weights', kernel_shape,
        initializer=tf.random_normal_initializer(stddev=0.02))
    h = tf.nn.conv2d(inp, weights, strides, padding='SAME')
    out_shape = h.get_shape()

    if bn:
        h = batch_norm(h, reuse=reuse, is_training=is_training_cond,
            scope=tf.get_variable_scope(), scale=True)

    if leaky_relu:
        h = relu_block(h, alpha=0.01)

    if use_bias:
        bias = tf.get_variable('bias', out_shape[1:])
        h += bias

    if dropout:
        h = tf.nn.dropout(h, dropout)

    if relu:
        h = tf.nn.relu(h)

    return h

def dense_block(inp, relu=False, output_size=1024):
    inp_size = inp.get_shape()
    h = tf.reshape(inp, [int(inp_size[0]), -1])
    h_size = h.get_shape()[1]

    w = tf.get_variable("w", [h_size, output_size],
        initializer=tf.random_normal_initializer(stddev=0.02))
    b = tf.get_variable("b", [output_size],
        initializer=tf.constant_initializer(0.0))

    h = tf.matmul(h, w) + b

    if relu:
        h = tf.nn.relu(h)

    return h

class Model(object):
    def __init__(self, sess):
        logging.info("Building Model")
        self.sess = sess
        with tf.name_scope("inp"):
            self.inp_batch = tf.placeholder(tf.float32,
                [BATCH_SIZE, HEIGHT, WIDTH, NUM_CHANNELS])
            self.inp_single = tf.placeholder(tf.float32,
                [1, HEIGHT, WIDTH, NUM_CHANNELS])
        with tf.name_scope("labels"):
            self.labels = tf.placeholder(tf.int32, [BATCH_SIZE])
            labels_one_hot = tf.one_hot(self.labels, NUM_MASSES)

        with tf.variable_scope("model") as scope:
            self.model_train = self._build_model(self.inp_batch)
            scope.reuse_variables()
            self.model_pred = self._build_model(self.inp_single)

        with tf.name_scope("cross_entropy"):
            self.loss = tf.reduce_sum(
                tf.nn.softmax_cross_entropy_with_logits(
                labels=labels_one_hot,
                logits=self.model_train))
            tf.summary.scalar('loss', self.loss)

        with tf.name_scope("accuracy"):
            self.accuracy = tf.reduce_mean(
                tf.cast(tf.equal(self.labels, 
                tf.cast(tf.argmax(self.model_train, 1), tf.int32)),
                tf.float32))
            tf.summary.scalar('accuracy', self.accuracy)


        update_ops = tf.get_collection(tf.GraphKeys.UPDATE_OPS)
        updates = tf.group(*update_ops)
        self.loss = with_dependencies([updates], self.loss)
        with tf.name_scope("train"):
            self.optim = (tf.train.AdamOptimizer(LEARNING_RATE, beta1=BETA)
                          .minimize(self.loss))

        self.saver = tf.train.Saver(max_to_keep=5)
        if START_CHECKPOINT:
            self.saver.restore(self.sess, START_CHECKPOINT)
            logging.info("Using Model " + START_CHECKPOINT)

        self.sess.run(tf.global_variables_initializer())
        self.summary = tf.summary.merge_all()
        self.train_writer = tf.summary.FileWriter(
            os.path.join(LOGS_DIR), self.sess.graph)


    def _build_model(self, inp):
        # TODO Probably add pooling
        with tf.variable_scope("conv1"):
            h = conv_block(inp, kernel_size=5, output_channels=32, relu=True)

        # with tf.variable_scope("conv2"):
        #     h = conv_block(h, kernel_size=5, output_channels=128, relu=True)

        # with tf.variable_scope("conv3"):
        #     h = conv_block(h, kernel_size=3, output_channels=128, relu=True)

        # with tf.variable_scope("conv4"):
        #     h = conv_block(h, kernel_size=3, output_channels=128, relu=True)

        with tf.variable_scope("dense1"):
            h = dense_block(h, relu=True, output_size=NUM_MASSES)

        h = tf.reshape(h, [int(inp.get_shape()[0]), -1])

        return h

    def update_percept(self):
        if len(self.history) < MIN_SAMPLES:
            return

        inp, labels = zip(*random.sample(self.history, BATCH_SIZE))

        _, summary = self.sess.run([self.optim, self.summary], feed_dict={
            self.inp_batch:inp,
            self.labels:labels
        })

        self.train_writer.add_summary(summary, self.iter)
        self.iter += 1

    def run_percept(self):
        pass

    def update_actor(self):
        pass

    def run_actor(self, inp, info):
        delx = info["obj1"]["pos"][0] - info["actor"]["pos"][0]
        dely = info["obj1"]["pos"][1] - info["actor"]["pos"][1]
        if abs(delx) > abs(dely):
            if delx > 0:
                return 3
            else:
                return 2
        else:
            if dely > 0:
                return 1
            else:
                return 0

    def to_action_string(self, action):
        actions = ['UP', 'DOWN', 'LEFT', 'RIGHT', 'STOP']
        return actions[action]

    def run_episode(self):
        i = 0
        inp = None
        labels = None
        while i < ITERS_PER_EPS:
            line = sys.stdin.readline()
            if not line.startswith(SEND_PFX):
                continue

            info = json.loads(line[len(SEND_PFX):])
            frame = scipy.ndimage.imread(info["filename"], mode='RGB')
            label = info['obj1']['mass'] - 2

            if inp is None:
                inp = np.tile(frame, NUM_FRAMES)
            else:
                inp = np.concatenate((inp[:,:,:-NUM_IMG_CHANNELS], frame), axis=2)

            self.history.append((inp, label))

            self.update_percept()
            self.update_actor()

            action = self.run_actor(inp, info)

            send(self.to_action_string(action))
            i += 1

    def train(self):
        self.history = []
        self.iter = 0
        logging.info("Training")
        for episode in range(NUM_EPISODES):
            self.run_episode()
            logging.info("Saving Model")
            if episode % 50 == 0:
                self.saver.save(self.sess,
                    os.path.join(CHECKPOINT_DIR, 'ckpt_' + str(episode)+ '.ckpt'))

def main():
    config = tf.ConfigProto()
    config.gpu_options.allow_growth = True
    sess = tf.Session()

    model = Model(sess)
    model.train()

    sess.close()
 
if __name__ == '__main__':
    main()
