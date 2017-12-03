#!/bin/bash
ffmpeg -r 10 -start_number 0 -i ${1}_%d.png -vcodec mpeg4 -b 5000k ${2}
